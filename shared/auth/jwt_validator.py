"""
Shared JWT validator for all Raksha microservices.
Each service imports this and uses get_current_user as a FastAPI dependency.
The SECRET_KEY and ALGORITHM must match the registry-svc (auth issuer).
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
import os

SECRET_KEY = os.getenv("SECRET_KEY", "raksha-shared-secret-key-change-in-production-2024")
ALGORITHM = os.getenv("ALGORITHM", "HS256")

security = HTTPBearer()


class TokenPayload(BaseModel):
    sub: str                        # user email
    role: str                       # super_admin | dept_admin | operator | viewer
    department_id: Optional[str]    # None for super_admin


def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return TokenPayload(
            sub=payload["sub"],
            role=payload["role"],
            department_id=payload.get("department_id"),
        )
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenPayload:
    return decode_token(credentials.credentials)


async def require_operator(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role not in ("operator", "dept_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Operator access required")
    return user


async def require_dept_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role not in ("dept_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Department admin access required")
    return user


async def require_super_admin(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user
