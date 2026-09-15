import asyncio
import re
from datetime import datetime
from typing import Optional

from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import settings


# ---------------------------------------------------------------------------
# Path → (action, resource_type) mapping
# ---------------------------------------------------------------------------

_ROUTE_MAP = [
    # Auth
    (re.compile(r"^/api/v1/auth/login$"), "POST", "LOGIN", "auth"),
    # Camera bulk import
    (re.compile(r"^/api/v1/cameras/bulk-import$"), "POST", "BULK_IMPORT_CAMERAS", "camera"),
    # Cameras
    (re.compile(r"^/api/v1/cameras/(?P<id>[^/]+)$"), "PUT", "UPDATE_CAMERA", "camera"),
    (re.compile(r"^/api/v1/cameras/(?P<id>[^/]+)$"), "DELETE", "DELETE_CAMERA", "camera"),
    (re.compile(r"^/api/v1/cameras/$"), "POST", "CREATE_CAMERA", "camera"),
    (re.compile(r"^/api/v1/cameras$"), "POST", "CREATE_CAMERA", "camera"),
    # Departments
    (re.compile(r"^/api/v1/departments/(?P<id>[^/]+)$"), "PUT", "UPDATE_DEPARTMENT", "department"),
    (re.compile(r"^/api/v1/departments/$"), "POST", "CREATE_DEPARTMENT", "department"),
    (re.compile(r"^/api/v1/departments$"), "POST", "CREATE_DEPARTMENT", "department"),
    # Users
    (re.compile(r"^/api/v1/users/(?P<id>[^/]+)$"), "PUT", "UPDATE_USER", "user"),
    (re.compile(r"^/api/v1/users/$"), "POST", "CREATE_USER", "user"),
    (re.compile(r"^/api/v1/users$"), "POST", "CREATE_USER", "user"),
    # Integration readiness
    (re.compile(r"^/api/v1/integration/cameras/(?P<id>[^/]+)$"), "POST", "UPDATE_INTEGRATION_READINESS", "integration_readiness"),
    (re.compile(r"^/api/v1/integration/cameras/(?P<id>[^/]+)$"), "PUT", "UPDATE_INTEGRATION_READINESS", "integration_readiness"),
]


def _resolve_action(path: str, method: str):
    """Return (action, resource_type, resource_id) or None if not mapped."""
    for pattern, map_method, action, resource_type in _ROUTE_MAP:
        if map_method != method:
            continue
        m = pattern.match(path)
        if m:
            resource_id = m.groupdict().get("id")
            return action, resource_type, resource_id
    return None


def _decode_user_from_request(request: Request):
    """
    Attempt to extract user info from the Authorization Bearer token.
    Returns (user_id, user_email, department_id) or (None, None, None).
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None, None, None

    token = auth_header[len("Bearer "):]
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        department_id = payload.get("department_id")
        # We don't have access to the DB here for a user lookup;
        # return what we can from the token.
        return None, email, department_id
    except JWTError:
        return None, None, None


async def _write_audit_log(
    action: str,
    resource_type: Optional[str],
    resource_id: Optional[str],
    user_email: Optional[str],
    department_id: Optional[str],
    ip_address: Optional[str],
    user_agent: Optional[str],
    method: str,
    path: str,
    result: str,
):
    """Write an AuditLog record using a fresh DB session."""
    try:
        from app.database import SessionLocal
        from app.models.audit_log import AuditLog
        from app.models.user import User
        from app.models.department import Department

        db = SessionLocal()
        try:
            user_id = None
            dept_name = None
            dept_uuid = None

            if user_email:
                user = db.query(User).filter(User.email == user_email).first()
                if user:
                    user_id = user.id

            if department_id:
                try:
                    import uuid as _uuid
                    dept_uuid = _uuid.UUID(str(department_id))
                    dept = db.query(Department).filter(Department.id == dept_uuid).first()
                    if dept:
                        dept_name = dept.name
                except (ValueError, AttributeError):
                    pass

            log = AuditLog(
                user_id=user_id,
                user_email=user_email,
                department_id=dept_uuid,
                department_name=dept_name,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=ip_address,
                user_agent=user_agent,
                request_method=method,
                request_path=path,
                result=result,
                created_at=datetime.utcnow(),
            )
            db.add(log)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
    except Exception:
        pass  # Never let audit logging break the application


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)

        # Only log write operations that succeeded (2xx)
        if request.method in ("POST", "PUT", "DELETE", "PATCH") and response.status_code < 300:
            path = request.url.path
            method = request.method

            resolved = _resolve_action(path, method)
            if resolved:
                action, resource_type, resource_id = resolved

                _, user_email, department_id = _decode_user_from_request(request)

                # Client IP — check X-Forwarded-For first
                forwarded_for = request.headers.get("X-Forwarded-For")
                if forwarded_for:
                    ip_address = forwarded_for.split(",")[0].strip()
                else:
                    ip_address = request.client.host if request.client else None

                user_agent = request.headers.get("User-Agent")
                result_str = "success"

                # Fire-and-forget: don't block the response
                asyncio.create_task(
                    _write_audit_log(
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        user_email=user_email,
                        department_id=department_id,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        method=method,
                        path=path,
                        result=result_str,
                    )
                )

        return response
