from typing import Type, TypeVar

from sqlmodel import Session, select

from core.base_model import BaseModel

ModelType = TypeVar("ModelType", bound=BaseModel)

def get_next_sequence(session: Session, model: Type[ModelType], field_name: str, prefix: str) -> str:
    """
    Finds the highest sequence number for a given prefix and returns the next formatted ID.
    Format: PREFIX-000001
    """
    # Query for the highest current ID with this prefix
    # We use LIKE 'PREFIX-%' to filter
    statement = (
        select(getattr(model, field_name))
        .where(getattr(model, field_name).like(f"{prefix}-%"))
        .order_by(getattr(model, field_name).desc())
        .limit(1)
    )
    
    last_id = session.exec(statement).first()
    
    if not last_id:
        return f"{prefix}-000001"
    
    try:
        # Extract the numeric part after the hyphen
        current_seq = int(last_id.split("-")[-1])
        next_seq = current_seq + 1
    except (ValueError, IndexError):
        # Fallback if the format is somehow messed up
        next_seq = 1
        
    return f"{prefix}-{next_seq:06d}"
