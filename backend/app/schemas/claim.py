from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class ClaimImageBase(BaseModel):
    image_id: str
    original_filename: str
    safe_filename: str
    mime_type: str
    size_bytes: int
    sha256: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime

class ClaimImagePublic(ClaimImageBase):
    model_config = ConfigDict(from_attributes=True)

class ClaimCreate(BaseModel):
    title: str
    claim_object: str
    user_claim: str
    incident_date: Optional[str] = None
    additional_notes: Optional[str] = None

class ClaimUpdate(BaseModel):
    title: Optional[str] = None
    claim_object: Optional[str] = None
    user_claim: Optional[str] = None
    incident_date: Optional[str] = None
    additional_notes: Optional[str] = None

class ClaimBase(BaseModel):
    public_claim_id: str
    user_claim: str
    claim_object: str
    incident_date: Optional[str] = None
    additional_notes: Optional[str] = None
    workflow_status: str
    created_at: datetime
    submitted_at: Optional[datetime] = None
    processing_started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    failure_code: Optional[str] = None
    failure_message: Optional[str] = None

class ClaimPublic(ClaimBase):
    id: int
    user_id: int
    images: List[ClaimImagePublic] = []
    
    model_config = ConfigDict(from_attributes=True)

class ReviewRequest(BaseModel):
    pass # Currently no body needed to trigger review in this phase

class AdminActionRequest(BaseModel):
    reason: str
