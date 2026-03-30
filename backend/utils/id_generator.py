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
    )
    
    all_ids = session.exec(statement).all()
    
    if not all_ids:
        return f"{prefix}-000001"
    
    max_seq = 0
    for record_id in all_ids:
        try:
            # Extract the numeric part after the LAST hyphen
            parts = record_id.split("-")
            if len(parts) >= 2:
                seq_str = parts[-1]
                if seq_str.isdigit():
                    max_seq = max(max_seq, int(seq_str))
        except (ValueError, IndexError):
            continue
            
    return f"{prefix}-{max_seq + 1:06d}"
