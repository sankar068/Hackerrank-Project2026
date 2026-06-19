import pytest
from app.models import User, AuditLog
from app.services.auth import verify_password
import json

def test_successful_registration(client, db):
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "username": "tester", "display_name": "Test User", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "user"
    assert "password" not in data
    assert "hashed_password" not in data

def test_duplicate_email_rejection(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "t1", "password": "password123"})
    response = client.post("/api/auth/register", json={"email": "test@example.com", "username": "t2", "password": "password123"})
    assert response.status_code == 400

def test_registration_cannot_create_admin(client, db):
    response = client.post(
        "/api/auth/register",
        json={"email": "test@example.com", "username": "adminwannabe", "password": "password123", "role": "admin"}
    )
    assert response.status_code == 201
    assert response.json()["role"] == "user"

def test_password_is_hashed(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    user = db.query(User).filter(User.email == "test@example.com").first()
    assert user.hashed_password != "password123"
    assert verify_password("password123", user.hashed_password)

def test_password_hash_not_returned(client, db):
    response = client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    assert "hashed_password" not in response.text
    assert "password123" not in response.text

def test_successful_login(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.cookies

def test_invalid_password(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
    assert response.status_code == 401

def test_unknown_email(client, db):
    response = client.post("/api/auth/login", json={"email": "unknown@example.com", "password": "password123"})
    assert response.status_code == 401

def test_inactive_user_login(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    user = db.query(User).filter(User.email == "test@example.com").first()
    user.is_active = False
    db.commit()
    response = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert response.status_code == 403

def test_auth_me_valid_token(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = login_resp.json()["access_token"]
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "test@example.com"

def test_missing_token(client, db):
    response = client.get("/api/auth/me")
    assert response.status_code == 401

def test_invalid_token(client, db):
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert response.status_code == 401

def test_expired_token(client, db):
    from app.services.auth import create_access_token
    from datetime import datetime, timedelta, timezone
    from jose import jwt
    from app.config import settings
    # Create manually expired
    expire = datetime.now(timezone.utc) - timedelta(minutes=10)
    to_encode = {"exp": expire, "sub": "1", "role": "user", "type": "access"}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {encoded_jwt}"})
    assert response.status_code == 401

def test_refresh_valid_cookie(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    
    refresh_response = client.post("/api/auth/refresh", cookies=login_resp.cookies)
    assert refresh_response.status_code == 200
    assert "access_token" in refresh_response.json()

def test_refresh_missing_invalid_cookie(client, db):
    refresh_response = client.post("/api/auth/refresh")
    assert refresh_response.status_code == 401

def test_logout_clears_cookie(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    assert "refresh_token" in login_resp.cookies
    
    logout_resp = client.post("/api/auth/logout")
    assert logout_resp.status_code == 200
    # The cookie should be empty or expired
    cookie_val = logout_resp.headers.get("set-cookie")
    assert 'refresh_token=""' in cookie_val or "refresh_token=;" in cookie_val

def test_normal_user_rejected_by_admin(client, db):
    from fastapi import APIRouter, Depends
    from app.api.deps import get_current_admin_user
    from app.main import app
    
    # Ad-hoc route
    @app.get("/api/admin-test")
    def admin_test(user=Depends(get_current_admin_user)):
        return {"status": "ok"}
        
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = login_resp.json()["access_token"]
    
    response = client.get("/api/admin-test", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403

def test_admin_accepted_by_admin_dependency(client, db):
    # Make admin
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    user = db.query(User).filter(User.email == "test@example.com").first()
    user.role = "admin"
    db.commit()
    
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    token = login_resp.json()["access_token"]
    
    response = client.get("/api/admin-test", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200

def test_admin_bootstrap_command(client, db):
    from app.cli import create_admin
    create_admin("admin@example.com", "Admin", "password123", db=db)
    user = db.query(User).filter(User.email == "admin@example.com").first()
    assert user is not None
    assert user.role == "admin"
    
def test_authentication_audit_events(client, db):
    # Register
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    logs = db.query(AuditLog).filter(AuditLog.action == "user_registered").all()
    assert len(logs) == 1
    
    # Failed login
    client.post("/api/auth/login", json={"email": "test@example.com", "password": "wrong"})
    logs = db.query(AuditLog).filter(AuditLog.action == "login_failed").all()
    assert len(logs) == 1
    
    # Successful login
    login_resp = client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    logs = db.query(AuditLog).filter(AuditLog.action == "login_succeeded").all()
    assert len(logs) == 1
    
    # Refresh token
    client.post("/api/auth/refresh", cookies=login_resp.cookies)
    logs = db.query(AuditLog).filter(AuditLog.action == "token_refreshed").all()
    assert len(logs) == 1

def test_secrets_not_in_logs(client, db):
    client.post("/api/auth/register", json={"email": "test@example.com", "username": "tester", "password": "password123"})
    client.post("/api/auth/login", json={"email": "test@example.com", "password": "password123"})
    
    logs = db.query(AuditLog).all()
    for log in logs:
        # Check reasons or values if they exist
        if log.reason:
            assert "password123" not in log.reason
            assert "access_token" not in log.reason
        if log.previous_value:
            assert "password123" not in log.previous_value
        if log.new_value:
            assert "password123" not in log.new_value
