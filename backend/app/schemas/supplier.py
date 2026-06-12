from __future__ import annotations

from datetime import datetime
from typing import Dict, Optional

from pydantic import BaseModel, Field


class SupplierBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    notes: Optional[str] = None
    contact: Optional[str] = None
    values: Dict[str, float]


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(SupplierBase):
    pass


class SupplierResponse(SupplierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
