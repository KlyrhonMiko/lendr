from datetime import timedelta
from uuid import UUID

from sqlmodel import Session, select

from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from utils.id_generator import get_next_sequence
from utils.security import verify_password


class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def authenticate_user(self, session: Session, username_or_email: str, password: str) -> User | None:
        statement = select(User).where((User.username == username_or_email) | (User.email == username_or_email)).where(User.is_deleted.is_(False))

        user = session.exec(statement).first()
        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        from utils.security import create_access_token as create_jwt
        
        return create_jwt(data) 

    def create_borrower_session(
        self,
        session: Session,
        user_id: str,
        expires_delta: timedelta,
        user_uuid: UUID | None = None,
    ) -> "BorrowerSession":
        from systems.auth.models.borrower_session import BorrowerSession
        from utils.time_utils import get_now_manila

        expires_at = get_now_manila() + expires_delta
        db_session = BorrowerSession(
            session_id=get_next_sequence(session, BorrowerSession, "session_id", "BSE"),
            borrower_uuid=user_uuid,
            expires_at=expires_at,
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        return db_session

    def is_borrower_session_valid(self, session: Session, session_id: str) -> bool:
        from systems.auth.models.borrower_session import BorrowerSession
        from utils.time_utils import get_now_manila

        statement = select(BorrowerSession).where(
            BorrowerSession.session_id == session_id,
            BorrowerSession.is_revoked == False,
            BorrowerSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()

        return db_session is not None

    def revoke_borrower_session(self, session: Session, session_id: str):
        from systems.auth.models.borrower_session import BorrowerSession
        statement = select(BorrowerSession).where(BorrowerSession.session_id == session_id)
        db_session = session.exec(statement).first()

        if db_session:
            db_session.is_revoked = True
            session.add(db_session)
            session.commit()

    def extend_borrower_session(self, session: Session, session_id: str, expires_delta: timedelta):
        from systems.auth.models.borrower_session import BorrowerSession
        from utils.time_utils import get_now_manila
        
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
    ) -> "UserSession":
        from systems.auth.models.user_session import UserSession
        from utils.time_utils import get_now_manila

        expires_at = get_now_manila() + expires_delta
        db_session = UserSession(
            session_id=get_next_sequence(session, UserSession, "session_id", "USE"),
            user_uuid=user_uuid,
            expires_at=expires_at,
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)

        return db_session

    def is_user_session_valid(self, session: Session, session_id: str) -> bool:
        from systems.auth.models.user_session import UserSession
        from utils.time_utils import get_now_manila

        statement = select(UserSession).where(
            UserSession.session_id == session_id,
            UserSession.is_revoked == False,
            UserSession.expires_at > get_now_manila()
        )
        db_session = session.exec(statement).first()

        return db_session is not None

    def revoke_user_session(self, session: Session, session_id: str):
        from systems.auth.models.user_session import UserSession
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.is_revoked = True
            session.add(db_session)
            session.commit()

    def extend_user_session(self, session: Session, session_id: str, expires_delta: timedelta):
        from systems.auth.models.user_session import UserSession
        from utils.time_utils import get_now_manila
        
        statement = select(UserSession).where(UserSession.session_id == session_id)
        db_session = session.exec(statement).first()
        if db_session:
            db_session.expires_at = get_now_manila() + expires_delta
            session.add(db_session)
            session.commit()

auth_service = AuthService()