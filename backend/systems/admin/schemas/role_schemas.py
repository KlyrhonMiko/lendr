from typing import List, Optional
from pydantic import BaseModel, Field

class RolePermissionUpdate(BaseModel):
    role: str = Field(..., description="The role slug to update (e.g., 'borrower', 'inventory_manager')")
    systems: List[str] = Field(..., description="List of systems allowed for this role")
    permissions: List[str] = Field(..., description="List of specific permissions allowed for this role")
    display_name: Optional[str] = Field(None, description="Updated display name for the role")
