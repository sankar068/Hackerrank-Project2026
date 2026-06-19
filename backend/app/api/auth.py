from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, AuditLog
from app.schemas.user import UserCreate, UserPublic
from app.schemas.auth import LoginRequest, Token
from app.services.auth import get_password_hash, verify_password, create_access_token, create_refresh_token
from app.api.deps import get_current_active_user
from app.config import settings
from jose import jwt, JWTError

router = APIRouter()

# Simple configuration for cookie flags (in production these would come from env vars)
COOKIE_SECURE = False  # Local dev over HTTP
COOKIE_SAMESITE = "lax"

def log_audit(db: Session, action: str, actor_id: int | None = None, actor_role: str | None = None, reason: str | None = None):
    audit = AuditLog(
        action=action,
        actor_id=actor_id,
        actor_role=actor_role,
        reason=reason
    )
    db.add(audit)
    db.commit()

@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Normalize email
    email = user_in.email.lower()
    
    # Reject duplicate email
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    
    # Enforce role=user
    user = User(
        email=email,
        username=user_in.username,
        display_name=user_in.display_name,
        hashed_password=get_password_hash(user_in.password),
        role="user",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Audit log
    log_audit(db, action="user_registered", actor_id=user.id, actor_role="user")
    
    return user

@router.post("/login", response_model=Token)
def login(response: Response, login_data: LoginRequest, db: Session = Depends(get_db)):
    email = login_data.email.lower()
    user = db.query(User).filter(User.email == email).first()
    
    # Use generic invalid credential error
    invalid_cred_exception = HTTPException(
        status_code=401,
        detail="Incorrect email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not user:
        log_audit(db, action="login_failed", reason="Unknown email")
        raise invalid_cred_exception
        
    if not verify_password(login_data.password, user.hashed_password):
        log_audit(db, action="login_failed", actor_id=user.id, reason="Invalid password")
        raise invalid_cred_exception
        
    if not user.is_active:
        log_audit(db, action="login_failed", actor_id=user.id, reason="Inactive user login")
        raise HTTPException(status_code=403, detail="Inactive user")

    access_token = create_access_token(subject=user.id, role=user.role)
    refresh_token = create_refresh_token(subject=user.id, role=user.role)
    
    # Set refresh token in HttpOnly cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=7 * 24 * 60 * 60 # 7 days
    )
    
    log_audit(db, action="login_succeeded", actor_id=user.id, actor_role=user.role)
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserPublic)
def read_users_me(current_user: User = Depends(get_current_active_user)):
    return current_user

@router.post("/refresh", response_model=Token)
def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    try:
        payload = jwt.decode(
            refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        token_type: str = payload.get("type")
        if token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
            
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
        
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Inactive user")
        
    new_access_token = create_access_token(subject=user.id, role=user.role)
    
    log_audit(db, action="token_refreshed", actor_id=user.id, actor_role=user.role)
    
    return {"access_token": new_access_token, "token_type": "bearer"}

@router.post("/logout")
def logout(response: Response, db: Session = Depends(get_db)):
    response.delete_cookie(
        key="refresh_token",
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        httponly=True
    )
    # Could capture the user if token was passed, but it's not strictly required
    # log_audit(db, action="logout")
    return {"message": "Successfully logged out"}
