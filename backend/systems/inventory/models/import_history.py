from uuid import UUID
from sqlmodel import Field, Column, JSON
from core.base_model import BaseModel

class ImportHistory(BaseModel, table=True):
    __tablename__ = "import_history"

    filename: str = Field(max_length=255)
    actor_id: UUID = Field(foreign_key="users.id")
    total_rows: int = Field(default=0)
    success_count: int = Field(default=0)
    error_count: int = Field(default=0)
    status: str = Field(max_length=50) # Completed, Failed, Partial Success
    
    # Store specific line errors as JSON
    error_log: dict | list = Field(default_factory=dict, sa_column=Column(JSON))
