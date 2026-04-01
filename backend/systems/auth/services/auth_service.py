from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlmodel import Session, select

from core.config import settings
from systems.admin.models.user import User
from systems.admin.services.audit_service import audit_service
from systems.admin.services.user_service import UserService
from utils.id_generator import get_next_sequence
from utils.security import get_password_hash, verify_and_update_password
from systems.auth.models.user_session import UserSession
from systems.auth.models.borrower_session import BorrowerSession
from utils.time_utils import get_now_manila


class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def _session_inactivity_timeout(self) -> timedelta | None:
        timeout_minutes = max(settings.AUTH_SESSION_INACTIVITY_TIMEOUT_MINUTES, 0)
        if timeout_minutes == 0:
            return None
        return timedelta(minutes=timeout_minutes)

    def _activity_touch_interval_seconds(self) -> int:
        return max(settings.AUTH_ACTIVITY_TOUCH_INTERVAL_SECONDS, 0)

    def _is_session_inactive(self, last_activity_at: datetime, now: datetime) -> bool:
        timeout = self._session_inactivity_timeout()
        if timeout is None:
            return False
        return last_activity_at <= (now - timeout)

    def _normalize_timestamp(self, value: datetime, reference: datetime) -> datetime:
        if value.tzinfo is None and reference.tzinfo is not None:
            as_reference_tz = value.replace(tzinfo=reference.tzinfo)
            skew_seconds = abs((reference - as_reference_tz).total_seconds())

            # PostgreSQL `timestamp without time zone` can round-trip aware values as
            # naive UTC. If the naive/local interpretation is wildly skewed, treat
            # the stored value as UTC and convert to the reference timezone.
            if skew_seconds > 6 * 60 * 60:
                return value.replace(tzinfo=UTC).astimezone(reference.tzinfo)

            return as_reference_tz
        return value

    def _should_touch_activity(self, last_activity_at: datetime, now: datetime) -> bool:
        touch_interval_seconds = self._activity_touch_interval_seconds()
        if touch_interval_seconds == 0:
            return True
        elapsed_seconds = (now - last_activity_at).total_seconds()
        return elapsed_seconds >= touch_interval_seconds

    def _validate_session_activity(
        self,
        session: Session,
        db_session: UserSession | BorrowerSession,
        touch_activity: bool,
    ) -> bool:
        now = get_now_manila()
        last_activity_at = db_session.last_activity_at or db_session.issued_at or db_session.created_at
        last_activity_at = self._normalize_timestamp(last_activity_at, now)

        if self._is_session_inactive(last_activity_at, now):
            db_session.is_revoked = True
            db_session.updated_at = now
            session.add(db_session)
            session.flush()
            return False

        if touch_activity and self._should_touch_activity(last_activity_at, now):
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

        return True

    def _enforce_user_session_limit(self, session: Session, user_uuid: UUID) -> None:
        max_sessions = max(settings.AUTH_MAX_ACTIVE_USER_SESSIONS, 1)
        now = get_now_manila()
        active_sessions = list(
            session.exec(
                select(UserSession)
                .where(
                    UserSession.user_uuid == user_uuid,
                    UserSession.is_revoked.is_(False),
                    UserSession.expires_at > now,
                )
                .order_by(UserSession.issued_at.asc())
            ).all()
        )

        sessions_to_revoke = len(active_sessions) - max_sessions + 1
        if sessions_to_revoke <= 0:
            return

        for existing_session in active_sessions[:sessions_to_revoke]:
            existing_session.is_revoked = True
            existing_session.updated_at = now
            session.add(existing_session)

    def _enforce_borrower_session_limit(self, session: Session, borrower_uuid: UUID) -> None:
        max_sessions = max(settings.AUTH_MAX_ACTIVE_BORROWER_SESSIONS, 1)
        now = get_now_manila()
        active_sessions = list(
            session.exec(
                select(BorrowerSession)
                .where(
                    BorrowerSession.borrower_uuid == borrower_uuid,
                    BorrowerSession.is_revoked.is_(False),
                    BorrowerSession.expires_at > now,
                )
                .order_by(BorrowerSession.issued_at.asc())
            ).all()
        )

        sessions_to_revoke = len(active_sessions) - max_sessions + 1
        if sessions_to_revoke <= 0:
            return

        for existing_session in active_sessions[:sessions_to_revoke]:
            existing_session.is_revoked = True
            existing_session.updated_at = now
            session.add(existing_session)

    def authenticate_user(self, session: Session, username_or_email: str, password: str) -> User | None:
        statement = select(User).where((User.username == username_or_email) | (User.email == username_or_email)).where(User.is_deleted.is_(False))

        user = session.exec(statement).first()
        if not user:
            return None

        verified, upgraded_hash = verify_and_update_password(password, user.hashed_password)
        if not verified:
            return None

        if upgraded_hash:
            user.hashed_password = upgraded_hash
            user.updated_at = get_now_manila()
            session.add(user)

        return user

    def is_bootstrap_admin(self, user: User | None) -> bool:
        return bool(user and user.user_id == "ADMIN-001")

    def should_force_bootstrap_password_rotation(self, user: User | None) -> bool:
        return bool(self.is_bootstrap_admin(user) and user.must_change_password)

    def authenticate_bootstrap_admin(
        self,
        session: Session,
        username_or_email: str,
        password: str,
    ) -> User | None:
        user = self.authenticate_user(session, username_or_email, password)
        if not self.is_bootstrap_admin(user):
            return None
        return user

    def rotate_bootstrap_admin_password(
        self,
        session: Session,
        user: User,
        new_password: str,
    ) -> User:
        if not self.is_bootstrap_admin(user):
            raise ValueError("Only ADMIN-001 can use bootstrap password rotation")

        user.hashed_password = get_password_hash(new_password)
        user.must_change_password = False
        user.password_rotated_at = get_now_manila()
        user.updated_at = get_now_manila()

        session.add(user)
        session.flush()
        session.refresh(user)
        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        from utils.security import create_access_token as create_jwt
        
        return create_jwt(data, expires_delta=expires_delta)

    def create_borrower_session(
        self,
        session: Session,
        user_id: str,
        expires_delta: timedelta,
        user_uuid: UUID | None = None,
        device_id: str | None = None,
    ) -> BorrowerSession:
        now = get_now_manila()
        expires_at = now + expires_delta
        if user_uuid:
            self._enforce_borrower_session_limit(session, user_uuid)

        db_session = BorrowerSession(
            session_id=get_next_sequence(session, BorrowerSession, "session_id", "BSE"),
            borrower_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
            last_activity_at=now,
        )
        session.add(db_session)
        session.flush()
        session.refresh(db_session)

        return db_session

    def is_borrower_session_valid(
        self,
        session: Session,
        session_id: str,
        touch_activity: bool = False,
    ) -> bool:
        statement = select(BorrowerSession).where(
            BorrowerSession.session_id == session_id,
            BorrowerSession.is_revoked.is_(False),
            BorrowerSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()
        if not db_session:
            return False

        return self._validate_session_activity(session, db_session, touch_activity=touch_activity)

    def revoke_borrower_session(self, session: Session, session_id: str):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()

        if db_session:
            db_session.is_revoked = True
            db_session.updated_at = get_now_manila()
            session.add(db_session)
            session.flush()

    def extend_borrower_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            now = get_now_manila()
            db_session.expires_at = now + expires_delta
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

    def create_user_session(
        self,
        session: Session,
        user_uuid: UUID,
        expires_delta: timedelta,
        device_id: str | None = None,
    ) -> UserSession:
        now = get_now_manila()
        expires_at = now + expires_delta
        self._enforce_user_session_limit(session, user_uuid)

        db_session = UserSession(
            session_id=get_next_sequence(session, UserSession, "session_id", "USE"),
            user_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
            last_activity_at=now,
        )
        session.add(db_session)
        session.flush()
        session.refresh(db_session)

        return db_session

    def is_user_session_valid(
        self,
        session: Session,
        session_id: str,
        touch_activity: bool = False,
    ) -> bool:
        statement = select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()
        if not db_session:
            return False

        return self._validate_session_activity(session, db_session, touch_activity=touch_activity)

    def revoke_user_session(self, session: Session, session_id: str):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.is_revoked = True
            db_session.updated_at = get_now_manila()
            session.add(db_session)
            session.flush()

    def revoke_session_by_id(self, session: Session, session_id: str) -> bool:
        """Revoke a session by session_id regardless of role/table origin."""
        now = get_now_manila()

        if session_id.startswith("USE"):
            db_session = session.exec(
                select(UserSession).where(UserSession.session_id == session_id)
            ).first()
            if db_session:
                db_session.is_revoked = True
                db_session.updated_at = now
                session.add(db_session)
                session.flush()
                return True

        if session_id.startswith("BSE"):
            db_session = session.exec(
                select(BorrowerSession).where(BorrowerSession.session_id == session_id)
            ).first()
            if db_session:
                db_session.is_revoked = True
                db_session.updated_at = now
                session.add(db_session)
                session.flush()
                return True

        # Defensive fallback for any legacy/non-standard prefix.
        db_user_session = session.exec(
            select(UserSession).where(UserSession.session_id == session_id)
        ).first()
        if db_user_session:
            db_user_session.is_revoked = True
            db_user_session.updated_at = now
            session.add(db_user_session)
            session.flush()
            return True

        db_borrower_session = session.exec(
            select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        ).first()
        if db_borrower_session:
            db_borrower_session.is_revoked = True
            db_borrower_session.updated_at = now
            session.add(db_borrower_session)
            session.flush()
            return True

        return False

    def extend_user_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            now = get_now_manila()
            db_session.expires_at = now + expires_delta
            db_session.last_activity_at = now
            db_session.updated_at = now
            session.add(db_session)
            session.flush()

    def revoke_all_other_sessions(
        self,
        session: Session,
        exclude_session_id: str | None = None,
        actor_id: UUID | None = None,
    ):
        """Revoke all active user and borrower sessions, except for the specified exclude_session_id."""
        now = get_now_manila()
        
        # Revoke User Sessions
        stmt_user = select(UserSession).where(
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > now
        )
        if exclude_session_id:
            stmt_user = stmt_user.where(UserSession.session_id != exclude_session_id)
            
        user_sessions = session.exec(stmt_user).all()
        for us in user_sessions:
            us.is_revoked = True
            session.add(us)
            
        # Revoke Borrower Sessions
        stmt_borrower = select(BorrowerSession).where(
            BorrowerSession.is_revoked.is_(False),
            BorrowerSession.expires_at > now
        )
        if exclude_session_id:
            stmt_borrower = stmt_borrower.where(BorrowerSession.session_id != exclude_session_id)
            
        borrower_sessions = session.exec(stmt_borrower).all()
        for bs in borrower_sessions:
            bs.is_revoked = True
            session.add(bs)

        audit_service.log_action(
            db=session,
            entity_type="session",
            entity_id=exclude_session_id or "all",
            action="revoke_all_other_sessions",
            actor_id=actor_id,
            after={
                "revoked_user_sessions": len(user_sessions),
                "revoked_borrower_sessions": len(borrower_sessions),
                "excluded_session_id": exclude_session_id,
            },
        )

        session.flush()

    def revoke_sessions_for_user(self, session: Session, user_uuid: UUID):
        """Revoke all non-expired sessions owned by a specific user."""
        now = get_now_manila()

        user_sessions = session.exec(
            select(UserSession).where(
                UserSession.user_uuid == user_uuid,
                UserSession.is_revoked.is_(False),
                UserSession.expires_at > now,
            )
        ).all()
        for db_session in user_sessions:
            db_session.is_revoked = True
            session.add(db_session)

        borrower_sessions = session.exec(
            select(BorrowerSession).where(
                BorrowerSession.borrower_uuid == user_uuid,
                BorrowerSession.is_revoked.is_(False),
                BorrowerSession.expires_at > now,
            )
        ).all()
        for db_session in borrower_sessions:
            db_session.is_revoked = True
            session.add(db_session)

        session.flush()

auth_service = AuthService()