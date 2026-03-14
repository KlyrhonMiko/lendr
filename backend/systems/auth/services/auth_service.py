from datetime import timedelta

from sqlmodel import Session, select

from systems.admin.models.user import User
from systems.admin.services.user_service import UserService
from utils.security import verify_password


class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def authenticate_user(self, session: Session, username_or_email: str, password: str) -> User | None:
        statement = select(User).where(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).where(User.is_deleted.is_(False))

        user = session.exec(statement).first()
        if not user:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        from utils.security import create_access_token as create_jwt

        return create_jwt(data["sub"])

    def create_borrower_session(self, session: Session, user_id: str, expires_delta: timedelta) -> "BorrowerSession":
        from systems.auth.models.borrower_session import BorrowerSession
        from utils.time_utils import get_now_manila

        expires_at = get_now_manila() + expires_delta
        db_session = BorrowerSession(
            borrower_id=user_id,
            expires_at=expires_at,
        )
        session.add(db_session)
        session.commit()
        session.refresh(db_session)
        return db_session


auth_service = AuthService()