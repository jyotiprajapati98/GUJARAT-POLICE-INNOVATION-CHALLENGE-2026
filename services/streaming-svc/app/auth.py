from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from typing import Optional
from app.config import settings

security = HTTPBearer()

class TokenPayload(BaseModel):
    sub: str
    role: str
    department_id: Optional[str] = None

def decode_token(token: str) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return TokenPayload(sub=payload["sub"], role=payload["role"], department_id=payload.get("department_id"))
    except (JWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired token", headers={"WWW-Authenticate": "Bearer"})

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenPayload:
    return decode_token(credentials.credentials)

async def require_operator(user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
    if user.role not in ("operator", "dept_admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Operator access required")
    return user
