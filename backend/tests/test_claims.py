import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import User, Claim, ClaimImage
from datetime import datetime, timezone
import io

@pytest.fixture
def test_client():
    return TestClient(app)

@pytest.fixture
def auth_headers(client):
    client.post("/api/auth/register", json={"email": "u1@example.com", "username": "u1", "password": "password123"})
    res = client.post("/api/auth/login", json={"email": "u1@example.com", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def auth_headers_user2(client):
    client.post("/api/auth/register", json={"email": "u2@example.com", "username": "u2", "password": "password123"})
    res = client.post("/api/auth/login", json={"email": "u2@example.com", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers(client, db):
    client.post("/api/auth/register", json={"email": "a1@example.com", "username": "a1", "password": "password123"})
    from app.models import User
    admin = db.query(User).filter(User.email=="a1@example.com").first()
    admin.role = "admin"
    db.commit()
    
    res = client.post("/api/auth/login", json={"email": "a1@example.com", "password": "password123"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_user_creates_draft_claim(test_client, auth_headers):
    response = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={
            "title": "My claim title",
            "claim_object": "laptop",
            "user_claim": "The laptop is damaged."
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "My claim title"
    assert data["workflow_status"] == "draft"
    assert data["public_claim_id"].startswith("CLM-")

def test_user_sees_only_own_claims(test_client, auth_headers, auth_headers_user2):
    # User 1 creates claim
    test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "User1", "claim_object": "laptop", "user_claim": "1"}
    )
    # User 2 creates claim
    test_client.post(
        "/api/claims",
        headers=auth_headers_user2,
        json={"title": "User2", "claim_object": "car", "user_claim": "2"}
    )
    
    res1 = test_client.get("/api/claims", headers=auth_headers)
    assert len(res1.json()) == 1
    assert res1.json()[0]["title"] == "User1"
    
def test_user_cannot_access_another_user_claim(test_client, auth_headers, auth_headers_user2):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "User1", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    
    # User 2 tries to get it
    res_err = test_client.get(f"/api/claims/{claim_id}", headers=auth_headers_user2)
    assert res_err.status_code == 404

def test_draft_can_be_edited(test_client, auth_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "Old", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    res2 = test_client.patch(
        f"/api/claims/{claim_id}",
        headers=auth_headers,
        json={"title": "New"}
    )
    assert res2.status_code == 200
    assert res2.json()["title"] == "New"

def test_valid_image_upload(test_client, auth_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "Image Test", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    
    # create valid 1x1 png in memory
    import io
    from PIL import Image
    img = Image.new('RGB', (1, 1), color = 'red')
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    img_byte_arr = img_byte_arr.getvalue()
    
    files = {"file": ("test.png", img_byte_arr, "image/png")}
    res_upload = test_client.post(f"/api/claims/{claim_id}/images", headers=auth_headers, files=files)
    assert res_upload.status_code == 200
    assert "img_" in res_upload.json()["image_id"]

def test_claim_submission(test_client, auth_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "Submit me", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    
    # Add image
    import io
    from PIL import Image
    img = Image.new('RGB', (1, 1))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    files = {"file": ("test.png", img_byte_arr.getvalue(), "image/png")}
    test_client.post(f"/api/claims/{claim_id}/images", headers=auth_headers, files=files)
    
    res_submit = test_client.post(f"/api/claims/{claim_id}/submit", headers=auth_headers)
    assert res_submit.status_code == 200
    assert res_submit.json()["workflow_status"] == "submitted"

def test_submitted_claim_cannot_be_edited(test_client, auth_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "Submit me", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    
    import io
    from PIL import Image
    img = Image.new('RGB', (1, 1))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='PNG')
    files = {"file": ("test.png", img_byte_arr.getvalue(), "image/png")}
    test_client.post(f"/api/claims/{claim_id}/images", headers=auth_headers, files=files)
    test_client.post(f"/api/claims/{claim_id}/submit", headers=auth_headers)
    
    res_edit = test_client.patch(
        f"/api/claims/{claim_id}",
        headers=auth_headers,
        json={"title": "New Title"}
    )
    assert res_edit.status_code == 400

def test_admin_sees_all_claims(test_client, auth_headers, admin_headers):
    test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "User Claim", "claim_object": "laptop", "user_claim": "1"}
    )
    
    res_admin = test_client.get("/api/admin/claims", headers=admin_headers)
    assert res_admin.status_code == 200
    assert res_admin.json()["total"] >= 1

def test_normal_user_cannot_access_admin_apis(test_client, auth_headers):
    res = test_client.get("/api/admin/claims", headers=auth_headers)
    assert res.status_code == 403

def test_request_more_evidence_workflow(test_client, auth_headers, admin_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "Evidence req", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    
    res_admin = test_client.post(
        f"/api/admin/claims/{claim_id}/request-evidence",
        headers=admin_headers,
        json={"reason": "Need more"}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["workflow_status"] == "more_evidence_required"
    
def test_missing_ai_configuration_creates_no_fake_review(test_client, auth_headers):
    res = test_client.post(
        "/api/claims",
        headers=auth_headers,
        json={"title": "AI Check", "claim_object": "laptop", "user_claim": "1"}
    )
    claim_id = res.json()["id"]
    res_review = test_client.post(f"/api/claims/{claim_id}/review", headers=auth_headers)
    assert res_review.status_code == 500
    assert res_review.json()["detail"]["error"]["code"] == "AI_REVIEW_SERVICE_NOT_CONFIGURED"
