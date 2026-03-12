from passlib.context import CryptContext

# Setup the password hashing context
# Switching to argon2 which is more robust and avoids the bcrypt 72-char limit
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Hashes a plain-text password using argon2."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against its hashed version."""
    return pwd_context.verify(plain_password, hashed_password)
