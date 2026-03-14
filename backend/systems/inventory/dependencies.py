from fastapi import Depends, HTTPException, status
from systems.admin.models.user import User
from core.deps import get_current_user

def shift_guard(current_user: User = Depends(get_current_user)):
    """Prevents inventory changes during unauthorized shifts."""
    if current_user.shift_type == "night" and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Night shift users are restricted from performing inventory adjustments."
        )
    return current_user
