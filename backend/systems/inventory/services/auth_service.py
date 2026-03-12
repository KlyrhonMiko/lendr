from typing import Optional
from sqlmodel import Session, select
from systems.inventory.models.user import User
from systems.inventory.services.user_service import UserService
from utils.security import verify_password

class AuthService:
    def __init__(self):
        self.user_service = UserService()

    def authenticate(self, session: Session, username_or_email: str, password: str) -> Optional[User]:
        statement = select(User).where(
            (User.username == username_or_email) | (User.email == username_or_email)
        ).where(User.is_deleted.is_(False))
        
        user = session.exec(statement).first()
        
        if not user:
            return None
            
        if not verify_password(password, user.hashed_password):
            return None
            
        return user

auth_service = AuthService()
