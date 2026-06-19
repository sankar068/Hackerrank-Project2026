import os
import shutil
import hashlib
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from PIL import Image, UnidentifiedImageError

from app.database import get_db
from app.models import User, Claim, ClaimImage, AuditLog
from app.api.deps import get_current_active_user
from app.schemas.claim import ClaimCreate, ClaimUpdate, ClaimPublic, ClaimImagePublic, ReviewRequest

router = APIRouter()

UPLOAD_DIR = "uploads"
MAX_IMAGES_PER_CLAIM = 5
MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 # 10MB
ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"]

os.makedirs(UPLOAD_DIR, exist_ok=True)

def create_audit_log(db: Session, user: User, action: str, claim_id: int, prev: str = None, new_val: str = None, reason: str = None):
    log = AuditLog(
        actor_id=user.id if user else None,
        actor_role=user.role if user else None,
        action=action,
        claim_id=claim_id,
        previous_value=prev,
        new_value=new_val,
        reason=reason
    )
    db.add(log)

def get_user_claim(db: Session, user: User, claim_id: int) -> Claim:
    claim = db.query(Claim).filter(Claim.id == claim_id, Claim.user_id == user.id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim

@router.post("", response_model=ClaimPublic)
def create_claim(claim_in: ClaimCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    if claim_in.claim_object not in ["car", "laptop", "package"]:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_OBJECT", "message": "Invalid claim object"}})
    
    year = datetime.now(timezone.utc).year
    short_id = str(uuid.uuid4()).split('-')[0].upper()
    public_id = f"CLM-{year}-{short_id}"

    db_claim = Claim(
        public_claim_id=public_id,
        user_id=current_user.id,
        title=claim_in.title,
        user_claim=claim_in.user_claim,
        claim_object=claim_in.claim_object,
        incident_date=claim_in.incident_date,
        additional_notes=claim_in.additional_notes,
        workflow_status="draft"
    )
    db.add(db_claim)
    db.commit()
    db.refresh(db_claim)

    create_audit_log(db, current_user, "claim_created", db_claim.id)
    db.commit()

    return db_claim

@router.get("", response_model=List[ClaimPublic])
def list_claims(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Claim).filter(Claim.user_id == current_user.id).order_by(Claim.created_at.desc()).all()

@router.get("/{claim_id}", response_model=ClaimPublic)
def get_claim(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return get_user_claim(db, current_user, claim_id)

@router.patch("/{claim_id}", response_model=ClaimPublic)
def update_claim(claim_id: int, claim_in: ClaimUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if claim.workflow_status != "draft":
        raise HTTPException(status_code=400, detail={"error": {"code": "CLAIM_NOT_EDITABLE", "message": "Only draft claims can be edited"}})
    
    update_data = claim_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(claim, key, value)
    
    create_audit_log(db, current_user, "claim_updated", claim.id)
    db.commit()
    db.refresh(claim)
    return claim

@router.post("/{claim_id}/images", response_model=ClaimImagePublic)
def upload_image(claim_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if claim.workflow_status not in ["draft", "more_evidence_required"]:
        raise HTTPException(status_code=400, detail={"error": {"code": "UPLOAD_NOT_ALLOWED", "message": "Cannot upload images in current status"}})
    
    if len(claim.images) >= MAX_IMAGES_PER_CLAIM:
        raise HTTPException(status_code=400, detail={"error": {"code": "MAX_IMAGES_EXCEEDED", "message": f"Maximum of {MAX_IMAGES_PER_CLAIM} images allowed"}})
        
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_FILE_TYPE", "message": "Invalid file type"}})
        
    content = file.file.read()
    if len(content) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(status_code=400, detail={"error": {"code": "FILE_TOO_LARGE", "message": "File size exceeds limit"}})
        
    # Generate checksum
    sha256 = hashlib.sha256(content).hexdigest()
    
    # Check duplicate
    for img in claim.images:
        if img.sha256 == sha256:
            raise HTTPException(status_code=400, detail={"error": {"code": "DUPLICATE_IMAGE", "message": "Duplicate image detected"}})
    
    # Verify image with Pillow
    temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}")
    with open(temp_path, "wb") as f:
        f.write(content)
        
    try:
        with Image.open(temp_path) as img:
            img.verify() # verify signature
        with Image.open(temp_path) as img:
            width, height = img.size
    except Exception:
        os.remove(temp_path)
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_IMAGE", "message": "Invalid or corrupted image file"}})
        
    # Generate stable IDs and save
    next_img_num = len(claim.images) + 1
    image_id = f"img_{next_img_num}_{uuid.uuid4().hex[:8]}"
    extension = file.filename.split('.')[-1] if '.' in file.filename else 'bin'
    safe_filename = f"{claim.public_claim_id}_{image_id}.{extension}"
    storage_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    os.rename(temp_path, storage_path)
    
    db_image = ClaimImage(
        image_id=image_id,
        claim_id=claim.id,
        original_filename=file.filename,
        safe_filename=safe_filename,
        storage_path=storage_path,
        mime_type=file.content_type,
        size_bytes=len(content),
        sha256=sha256,
        width=width,
        height=height
    )
    db.add(db_image)
    create_audit_log(db, current_user, "claim_image_uploaded", claim.id, new_val=image_id)
    db.commit()
    db.refresh(db_image)
    return db_image

@router.delete("/{claim_id}/images/{image_id}")
def delete_image(claim_id: int, image_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if claim.workflow_status != "draft":
        raise HTTPException(status_code=400, detail={"error": {"code": "DELETE_NOT_ALLOWED", "message": "Cannot delete images from submitted claims"}})
        
    image = db.query(ClaimImage).filter(ClaimImage.claim_id == claim.id, ClaimImage.image_id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    if os.path.exists(image.storage_path):
        os.remove(image.storage_path)
        
    db.delete(image)
    create_audit_log(db, current_user, "claim_image_removed", claim.id, prev=image_id)
    db.commit()
    return {"status": "success"}

@router.get("/{claim_id}/images/{image_id}")
def get_image(claim_id: int, image_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # Verify owner
    claim = get_user_claim(db, current_user, claim_id)
    image = db.query(ClaimImage).filter(ClaimImage.claim_id == claim.id, ClaimImage.image_id == image_id).first()
    if not image or not os.path.exists(image.storage_path):
        raise HTTPException(status_code=404, detail="Image not found")
        
    return FileResponse(image.storage_path, media_type=image.mime_type)

@router.post("/{claim_id}/submit", response_model=ClaimPublic)
def submit_claim(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if claim.workflow_status != "draft":
        raise HTTPException(status_code=400, detail={"error": {"code": "ALREADY_SUBMITTED", "message": "Claim is not in draft status"}})
        
    if not claim.title or not claim.user_claim:
        raise HTTPException(status_code=400, detail={"error": {"code": "MISSING_DATA", "message": "Title and description are required"}})
        
    if not claim.images:
        raise HTTPException(status_code=400, detail={"error": {"code": "MISSING_IMAGES", "message": "At least one image is required"}})
        
    claim.workflow_status = "submitted"
    claim.submitted_at = datetime.now(timezone.utc)
    create_audit_log(db, current_user, "claim_submitted", claim.id)
    db.commit()
    db.refresh(claim)
    return claim

@router.post("/{claim_id}/additional-evidence", response_model=ClaimPublic)
def submit_additional_evidence(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if claim.workflow_status != "more_evidence_required":
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_STATUS", "message": "Cannot submit additional evidence for this claim"}})
        
    claim.workflow_status = "submitted"
    create_audit_log(db, current_user, "additional_evidence_submitted", claim.id)
    db.commit()
    db.refresh(claim)
    return claim

@router.get("/{claim_id}/review")
def get_review(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    if not claim.review:
        raise HTTPException(status_code=404, detail="Review not found")
    return claim.review

@router.post("/{claim_id}/review", response_model=ClaimPublic)
def request_review(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    claim = get_user_claim(db, current_user, claim_id)
    
    # As per spec: Return typed error AI_REVIEW_SERVICE_NOT_CONFIGURED and do not invent a review
    raise HTTPException(status_code=500, detail={"error": {"code": "AI_REVIEW_SERVICE_NOT_CONFIGURED", "message": "AI review service is not configured."}})

@router.post("/{claim_id}/retry", response_model=ClaimPublic)
def retry_review(claim_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return request_review(claim_id, db, current_user)
