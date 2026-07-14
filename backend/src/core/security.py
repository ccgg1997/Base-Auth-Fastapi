from datetime import datetime, timedelta, timezone

import jwt  
from pwdlib import PasswordHash

from src.core.config import settings

password_hash = PasswordHash.recommended()

DUMMY_JWT_SECRET = password_hash.hash("your_secret_key") 

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)

def create_access_token(subject:str):
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.access_token_expire_minutes)
    
    payload = {
        "sub": subject,
        "iat": now,
        "exp": expires_at
    }
    
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

def decode_access_token(token: str):
    return jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm],
        options={"require": ["exp", "iat", "sub"]},
    )