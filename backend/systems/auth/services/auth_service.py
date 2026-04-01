from datetime import timedelta
from uuid import UUID

from sqlmodel import Session, select

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
        session.commit()
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
        expires_at = get_now_manila() + expires_delta
        db_session = BorrowerSession(
            session_id=get_next_sequence(session, BorrowerSession, "session_id", "BSE"),
            borrower_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        return db_session

    def is_borrower_session_valid(self, session: Session, session_id: str) -> bool:
        statement = select(BorrowerSession).where(
            BorrowerSession.session_id == session_id,
            BorrowerSession.is_revoked.is_(False),
            BorrowerSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()

        return db_session is not None

    def revoke_borrower_session(self, session: Session, session_id: str):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()

        if db_session:
            db_session.is_revoked = True
            session.add(db_session)
            session.commit()

    def extend_borrower_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.expires_at = get_now_manila() + expires_delta
            session.add(db_session)
            session.commit()

    def create_user_session(
        self,
        session: Session,
        user_uuid: UUID,
        expires_delta: timedelta,
        device_id: str | None = None,
    ) -> UserSession:
        expires_at = get_now_manila() + expires_delta
        db_session = UserSession(
            session_id=get_next_sequence(session, UserSession, "session_id", "USE"),
            user_uuid=user_uuid,
            expires_at=expires_at,
            device_id=device_id,
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        return db_session

    def is_user_session_valid(self, session: Session, session_id: str) -> bool:
        statement = select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.is_revoked.is_(False),
            UserSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()

        return db_session is not None

    def revoke_user_session(self, session: Session, session_id: str):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.is_revoked = True
            session.add(db_session)
            session.commit()

    def extend_user_session(self, session: Session, session_id: str, expires_delta: timedelta):
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.expires_at = get_now_manila() + expires_delta
            session.add(db_session)
            session.commit()

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
            
        session.commit()

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

        session.commit()

auth_service = AuthService()