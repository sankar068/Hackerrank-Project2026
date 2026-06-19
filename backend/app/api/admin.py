from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models import User, Claim, ClaimImage, AuditLog, Review
from app.api.deps import get_current_admin_user
from app.schemas.claim import ClaimPublic, AdminActionRequest
from app.schemas.user import UserPublic

router = APIRouter(dependencies=[Depends(get_current_admin_user)])

def create_admin_audit_log(db: Session, admin: User, action: str, claim_id: int, prev: str = None, new_val: str = None, reason: str = None):
    log = AuditLog(
        actor_id=admin.id,
        actor_role=admin.role,
        action=action,
        claim_id=claim_id,
        previous_value=prev,
        new_value=new_val,
        reason=reason
    )
    db.add(log)

@router.get("/dashboard")
def get_dashboard(db: Session = Depends(get_db)):
    total = db.query(Claim).count()
    draft = db.query(Claim).filter(Claim.workflow_status == "draft").count()
    submitted = db.query(Claim).filter(Claim.workflow_status == "submitted").count()
    processing = db.query(Claim).filter(Claim.workflow_status == "processing").count()
    completed = db.query(Claim).filter(Claim.workflow_status == "completed").count()
    failed = db.query(Claim).filter(Claim.workflow_status == "failed").count()
    manual_review = db.query(Claim).filter(Claim.workflow_status == "manual_review").count()
    more_evidence_required = db.query(Claim).filter(Claim.workflow_status == "more_evidence_required").count()
    
    # Needs join with Review for these statuses
    supported = db.query(Review).filter(Review.claim_status == "supported").count()
    contradicted = db.query(Review).filter(Review.claim_status == "contradicted").count()
    not_enough_info = db.query(Review).filter(Review.claim_status == "not_enough_information").count()

    return {
        "total_claims": total,
        "draft": draft,
        "submitted": submitted,
        "processing": processing,
        "completed": completed,
        "failed": failed,
        "manual_review": manual_review,
        "more_evidence_required": more_evidence_required,
        "supported": supported,
        "contradicted": contradicted,
        "not_enough_information": not_enough_info
    }

@router.get("/claims")
def list_all_claims(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    workflow_status: Optional[str] = None,
    claim_object: Optional[str] = None,
    user_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Claim)
    
    if workflow_status:
        query = query.filter(Claim.workflow_status == workflow_status)
    if claim_object:
        query = query.filter(Claim.claim_object == claim_object)
    if user_id:
        query = query.filter(Claim.user_id == user_id)
        
    if search:
        search_pattern = f"%{search}%"
        query = query.join(User).filter(
            or_(
                Claim.public_claim_id.ilike(search_pattern),
                Claim.title.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.display_name.ilike(search_pattern)
            )
        )
        
    total_count = query.count()
    items = query.order_by(desc(Claim.created_at)).offset((page - 1) * page_size).limit(page_size).all()
    
    # We can use Pydantic models to dump, but returning raw DB objects works with FastAPI.
    return {
        "items": items,
        "total": total_count,
        "page": page,
        "page_size": page_size
    }

@router.get("/claims/{claim_id}", response_model=ClaimPublic)
def get_claim_details(claim_id: int, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim

@router.get("/review-queue")
def get_review_queue(db: Session = Depends(get_db)):
    statuses = ["submitted", "failed", "manual_review", "more_evidence_required"]
    claims = db.query(Claim).filter(Claim.workflow_status.in_(statuses)).order_by(Claim.submitted_at.asc()).all()
    
    result = []
    for c in claims:
        result.append({
            "id": c.id,
            "public_claim_id": c.public_claim_id,
            "claimant": c.user.display_name or c.user.email,
            "claim_object": c.claim_object,
            "title": c.title,
            "workflow_status": c.workflow_status,
            "submitted_at": c.submitted_at,
            "image_count": len(c.images),
            "failure_code": c.failure_code
        })
    return result

@router.post("/claims/{claim_id}/request-evidence", response_model=ClaimPublic)
def request_evidence(claim_id: int, req: AdminActionRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    prev_status = claim.workflow_status
    claim.workflow_status = "more_evidence_required"
    
    create_admin_audit_log(db, current_admin, "additional_evidence_requested", claim.id, prev=prev_status, new_val="more_evidence_required", reason=req.reason)
    db.commit()
    db.refresh(claim)
    return claim

@router.post("/claims/{claim_id}/manual-review", response_model=ClaimPublic)
def manual_review(claim_id: int, req: AdminActionRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    prev_status = claim.workflow_status
    claim.workflow_status = "manual_review"
    
    create_admin_audit_log(db, current_admin, "manual_review_requested", claim.id, prev=prev_status, new_val="manual_review", reason=req.reason)
    db.commit()
    db.refresh(claim)
    return claim

@router.post("/claims/{claim_id}/approve", response_model=ClaimPublic)
def approve_claim(claim_id: int, req: AdminActionRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if not claim.review:
        raise HTTPException(status_code=409, detail={"error": {"code": "NO_REVIEW_EXISTS", "message": "Cannot approve without a review"}})
        
    # Logic to approve
    raise NotImplementedError("Approval workflow requires complete feature definition")

@router.post("/claims/{claim_id}/override", response_model=ClaimPublic)
def override_claim(claim_id: int, req: AdminActionRequest, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
        
    if not claim.review:
        raise HTTPException(status_code=409, detail={"error": {"code": "NO_REVIEW_EXISTS", "message": "Cannot override without a review"}})
        
    raise NotImplementedError("Override workflow requires complete feature definition")

@router.post("/claims/{claim_id}/retry", response_model=ClaimPublic)
def admin_retry_claim(claim_id: int, db: Session = Depends(get_db), current_admin: User = Depends(get_current_admin_user)):
    raise HTTPException(status_code=500, detail={"error": {"code": "AI_REVIEW_SERVICE_NOT_CONFIGURED", "message": "AI review service is not configured."}})

@router.get("/users", response_model=List[UserPublic])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).all()

@router.get("/users/{user_id}")
def get_user_history(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    total_claims = db.query(Claim).filter(Claim.user_id == user.id).count()
    completed_claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.workflow_status == "completed").count()
    manual_review_claims = db.query(Claim).filter(Claim.user_id == user.id, Claim.workflow_status == "manual_review").count()
    
    # We join with Review to count the status
    supported_claims = db.query(Claim).join(Review).filter(Claim.user_id == user.id, Review.claim_status == "supported").count()
    contradicted_claims = db.query(Claim).join(Review).filter(Claim.user_id == user.id, Review.claim_status == "contradicted").count()
    not_enough_information_claims = db.query(Claim).join(Review).filter(Claim.user_id == user.id, Review.claim_status == "not_enough_information").count()
    
    from datetime import timedelta
    ninety_days_ago = datetime.now() - timedelta(days=90)
    claims_last_90_days = db.query(Claim).filter(Claim.user_id == user.id, Claim.created_at >= ninety_days_ago).count()
    
    return {
        "user": {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "display_name": user.display_name,
            "role": user.role,
            "is_active": user.is_active,
            "created_at": user.created_at
        },
        "history": {
            "total_claims": total_claims,
            "completed_claims": completed_claims,
            "manual_review_claims": manual_review_claims,
            "supported_claims": supported_claims,
            "contradicted_claims": contradicted_claims,
            "not_enough_information_claims": not_enough_information_claims,
            "claims_last_90_days": claims_last_90_days
        }
    }

@router.get("/audit")
def list_audit_logs(db: Session = Depends(get_db)):
    return db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(100).all()
