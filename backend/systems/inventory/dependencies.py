from fastapi import Depends, HTTPException, status
from sqlmodel import Session

from core.database import get_session
from systems.admin.services.audit_service import audit_service
from systems.admin.models.user import User
from core.deps import get_current_user

def shift_guard(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Prevents inventory changes during unauthorized shifts."""
    shift_type = (current_user.shift_type or "").lower()
    role = (current_user.role or "").lower()

    if shift_type == "night" and role == "admin":
        audit_service.log_action(
            db=session,
            entity_type="security",
            entity_id="shift_guard",
            action="admin_shift_guard_bypass",
            actor_id=current_user.id,
            after={
                "shift_type": current_user.shift_type,
                "role": current_user.role,
            },
        )
        session.commit()
        return current_user

    if shift_type == "night" and role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Night shift users are restricted from performing inventory adjustments."
        )
    return current_user
