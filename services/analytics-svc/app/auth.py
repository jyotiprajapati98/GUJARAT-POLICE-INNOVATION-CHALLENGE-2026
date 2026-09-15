from datetime import datetime
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token")


class TokenPayload(BaseModel):
    sub: str                        # user email or user id
    role: str                       # super_admin | dept_admin | operator | viewer
    department_id: Optional[str] = None
    exp: Optional[int] = None


def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        return TokenPayload(
            sub=payload.get("sub", ""),
            role=payload.get("role", "viewer"),
            department_id=payload.get("department_id"),
            exp=payload.get("exp"),
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    return decode_token(token)


def require_operator(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    allowed = {"operator", "dept_admin", "super_admin"}
    if user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operator role or higher required",
        )
    return user


def require_dept_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    allowed = {"dept_admin", "super_admin"}
    if user.role not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Department admin role or higher required",
        )
    return user


def require_super_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin role required",
        )
    return user
