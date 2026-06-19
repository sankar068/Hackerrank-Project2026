from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    claims = relationship("Claim", back_populates="user")

class Claim(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, index=True)
    public_claim_id = Column(String, unique=True, index=True, default=generate_uuid)
    user_id = Column(Integer, ForeignKey("users.id"))
    title = Column(String, nullable=False, default="Untitled")
    
    # Official output columns mapped
    user_claim = Column(Text, nullable=False) # Exact original claim conversation
    claim_object = Column(String, nullable=False)
    incident_date = Column(String, nullable=True)
    additional_notes = Column(Text, nullable=True)
    
    workflow_status = Column(String, default="pending", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    processing_started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    failure_code = Column(String, nullable=True)
    failure_message = Column(Text, nullable=True)

    user = relationship("User", back_populates="claims")
    images = relationship("ClaimImage", back_populates="claim")
    review = relationship("Review", back_populates="claim", uselist=False)

class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"))
    messages = Column(JSON, nullable=False) # Array of structured messages
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ClaimImage(Base):
    __tablename__ = "claim_images"

    id = Column(Integer, primary_key=True, index=True)
    image_id = Column(String, unique=True, index=True, nullable=False) # Stable ID (e.g. without extension)
    claim_id = Column(Integer, ForeignKey("claims.id"))
    original_filename = Column(String, nullable=False)
    safe_filename = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    size_bytes = Column(Integer, nullable=False)
    sha256 = Column(String, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="images")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    claim_id = Column(Integer, ForeignKey("claims.id"), unique=True)
    
    evidence_standard_met = Column(Boolean, nullable=True)
    evidence_standard_met_reason = Column(Text, nullable=True)
    risk_flags = Column(JSON, nullable=True) # JSON Array of flags
    issue_type = Column(String, nullable=True)
    object_part = Column(String, nullable=True)
    claim_status = Column(String, nullable=True)
    claim_status_justification = Column(Text, nullable=True)
    supporting_image_ids = Column(JSON, nullable=True) # JSON Array of stable image IDs
    valid_image = Column(Boolean, nullable=True)
    severity = Column(String, nullable=True)
    
    provider = Column(String, nullable=True)
    model = Column(String, nullable=True)
    processing_time_ms = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    claim = relationship("Claim", back_populates="review")

class EvidenceRule(Base):
    __tablename__ = "evidence_rules"

    id = Column(Integer, primary_key=True, index=True)
    requirement_id = Column(String, unique=True, index=True, nullable=False)
    claim_object = Column(String, nullable=False)
    applies_to = Column(String, nullable=False)
    minimum_image_evidence = Column(Integer, nullable=False, default=1)
    
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    actor_role = Column(String, nullable=True)
    action = Column(String, nullable=False)
    claim_id = Column(Integer, ForeignKey("claims.id"), nullable=True)
    previous_value = Column(Text, nullable=True)
    new_value = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
