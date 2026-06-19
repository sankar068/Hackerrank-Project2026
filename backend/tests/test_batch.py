import pytest
from app.batch.validator import validate_output, REQUIRED_COLUMNS
from app.batch.cli import load_csv_to_dict, load_requirements, run_batch
from app.batch.ai_provider import GeminiProvider, AIProviderError
import os
import tempfile
import csv
import json

def test_enums_rejections():
    # Write a bad CSV and validate it
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=REQUIRED_COLUMNS)
        writer_out.writeheader()
        
        base_row = {
            "user_id": "1",
            "image_paths": "img.jpg",
            "user_claim": "test",
            "claim_object": "laptop",
            "evidence_standard_met": "true",
            "evidence_standard_met_reason": "ok",
            "risk_flags": "none",
            "issue_type": "dent",
            "object_part": "body",
            "claim_status": "supported",
            "claim_status_justification": "ok",
            "supporting_image_ids": "img",
            "valid_image": "true",
            "severity": "medium"
        }
        
        # Test 1: approved rejection
        row1 = base_row.copy()
        row1["claim_status"] = "approved"
        writer_out.writerow(row1)
        out_name = out_f.name

    with pytest.raises(ValueError, match="Invalid claim_status 'approved'"):
        validate_output(in_name, out_name)
        
    os.remove(in_name)
    os.remove(out_name)

def test_manual_review_status_rejection():
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=REQUIRED_COLUMNS)
        writer_out.writeheader()
        
        base_row = {
            "user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop",
            "evidence_standard_met": "true", "evidence_standard_met_reason": "ok", "risk_flags": "none",
            "issue_type": "dent", "object_part": "body", "claim_status": "manual_review", 
            "claim_status_justification": "ok", "supporting_image_ids": "img", "valid_image": "true", "severity": "medium"
        }
        writer_out.writerow(base_row)
        out_name = out_f.name

    with pytest.raises(ValueError, match="Invalid claim_status 'manual_review'"):
        validate_output(in_name, out_name)
        
    os.remove(in_name)
    os.remove(out_name)

def test_critical_severity_rejection():
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=REQUIRED_COLUMNS)
        writer_out.writeheader()
        
        base_row = {
            "user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop",
            "evidence_standard_met": "true", "evidence_standard_met_reason": "ok", "risk_flags": "none",
            "issue_type": "dent", "object_part": "body", "claim_status": "supported", 
            "claim_status_justification": "ok", "supporting_image_ids": "img", "valid_image": "true", "severity": "critical"
        }
        writer_out.writerow(base_row)
        out_name = out_f.name

    with pytest.raises(ValueError, match="Invalid severity 'critical'"):
        validate_output(in_name, out_name)
        
    os.remove(in_name)
    os.remove(out_name)

def test_valid_unknown_severity():
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=REQUIRED_COLUMNS)
        writer_out.writeheader()
        
        base_row = {
            "user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop",
            "evidence_standard_met": "true", "evidence_standard_met_reason": "ok", "risk_flags": "none",
            "issue_type": "dent", "object_part": "body", "claim_status": "supported", 
            "claim_status_justification": "ok", "supporting_image_ids": "img", "valid_image": "true", "severity": "unknown"
        }
        writer_out.writerow(base_row)
        out_name = out_f.name

    is_valid, _ = validate_output(in_name, out_name)
    assert is_valid
        
    os.remove(in_name)
    os.remove(out_name)

def test_exact_csv_headers_and_order():
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object", "extra"])
        writer_out.writeheader()
        out_name = out_f.name

    with pytest.raises(ValueError, match="Output columns are incorrect"):
        validate_output(in_name, out_name)
        
    os.remove(in_name)
    os.remove(out_name)

def test_file_extension_rejected_in_supporting_ids():
    with tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as out_f, tempfile.NamedTemporaryFile("w", delete=False, newline='', suffix=".csv") as in_f:
        
        writer = csv.DictWriter(in_f, fieldnames=["user_id", "image_paths", "user_claim", "claim_object"])
        writer.writeheader()
        writer.writerow({"user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop"})
        in_name = in_f.name
        
        writer_out = csv.DictWriter(out_f, fieldnames=REQUIRED_COLUMNS)
        writer_out.writeheader()
        
        base_row = {
            "user_id": "1", "image_paths": "img.jpg", "user_claim": "test", "claim_object": "laptop",
            "evidence_standard_met": "true", "evidence_standard_met_reason": "ok", "risk_flags": "none",
            "issue_type": "dent", "object_part": "body", "claim_status": "supported", 
            "claim_status_justification": "ok", "supporting_image_ids": "img.jpg", "valid_image": "true", "severity": "unknown"
        }
        writer_out.writerow(base_row)
        out_name = out_f.name

    with pytest.raises(ValueError, match="contains an extension"):
        validate_output(in_name, out_name)
        
    os.remove(in_name)
    os.remove(out_name)

# --- AI Provider Tests ---
def test_provider_returns_stemmed_ids(monkeypatch):
    class MockResponse:
        def read(self):
            return json.dumps({
                "candidates": [{"content": {"parts": [{"text": json.dumps({
                    "evidence_standard_met": True,
                    "evidence_standard_met_reason": "looks ok",
                    "risk_flags": ["none"],
                    "issue_type": "dent",
                    "object_part": "hood",
                    "claim_status": "supported",
                    "claim_status_justification": "damage visible",
                    "supporting_image_ids": [0, 1],
                    "valid_image": True,
                    "severity": "medium"
                })}]}}]
            }).encode('utf-8')
            
    import urllib.request
    def mock_urlopen(*args, **kwargs):
        class Ctx:
            def __enter__(self): return MockResponse()
            def __exit__(self, *args): pass
        return Ctx()
        
    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    monkeypatch.setattr(GeminiProvider, "_image_to_part", lambda self, path: {"inlineData": {"mimeType": "image/jpeg", "data": "fake"}})
    
    os.environ["AI_API_KEY"] = "fake"
    os.environ["AI_MODEL"] = "gemini-3.5-flash"
    
    p = GeminiProvider()
    res = p.review_claim("test", "car", ["/tmp/img1.jpg", "/tmp/img2.png"], "history", "reqs")
    
    assert res["supporting_image_ids"] == "img1;img2"
    assert res["claim_status"] == "supported"

def test_provider_returns_contradicted(monkeypatch):
    class MockResponse:
        def read(self):
            return json.dumps({
                "candidates": [{"content": {"parts": [{"text": json.dumps({
                    "evidence_standard_met": True,
                    "evidence_standard_met_reason": "looks ok",
                    "risk_flags": ["none"],
                    "issue_type": "none",
                    "object_part": "hood",
                    "claim_status": "contradicted",
                    "claim_status_justification": "damage absent",
                    "supporting_image_ids": [0],
                    "valid_image": True,
                    "severity": "none"
                })}]}}]
            }).encode('utf-8')
            
    import urllib.request
    def mock_urlopen(*args, **kwargs):
        class Ctx:
            def __enter__(self): return MockResponse()
            def __exit__(self, *args): pass
        return Ctx()
        
    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    monkeypatch.setattr(GeminiProvider, "_image_to_part", lambda self, path: {"inlineData": {"mimeType": "image/jpeg", "data": "fake"}})
    
    os.environ["AI_API_KEY"] = "fake"
    os.environ["AI_MODEL"] = "gemini-3.5-flash"
    
    p = GeminiProvider()
    res = p.review_claim("test", "car", ["/tmp/img1.jpg"], "history", "reqs")
    
    assert res["claim_status"] == "contradicted"

def test_provider_returns_not_enough_info(monkeypatch):
    class MockResponse:
        def read(self):
            return json.dumps({
                "candidates": [{"content": {"parts": [{"text": json.dumps({
                    "evidence_standard_met": False,
                    "evidence_standard_met_reason": "too blurry",
                    "risk_flags": ["blurry_image"],
                    "issue_type": "unknown",
                    "object_part": "unknown",
                    "claim_status": "not_enough_information",
                    "claim_status_justification": "part not visible",
                    "supporting_image_ids": [],
                    "valid_image": False,
                    "severity": "unknown"
                })}]}}]
            }).encode('utf-8')
            
    import urllib.request
    def mock_urlopen(*args, **kwargs):
        class Ctx:
            def __enter__(self): return MockResponse()
            def __exit__(self, *args): pass
        return Ctx()
        
    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    monkeypatch.setattr(GeminiProvider, "_image_to_part", lambda self, path: {"inlineData": {"mimeType": "image/jpeg", "data": "fake"}})
    
    os.environ["AI_API_KEY"] = "fake"
    os.environ["AI_MODEL"] = "gemini-3.5-flash"
    
    p = GeminiProvider()
    res = p.review_claim("test", "car", ["/tmp/img1.jpg"], "history", "reqs")
    
    assert res["claim_status"] == "not_enough_information"
    assert res["supporting_image_ids"] == "none"

def test_provider_failure_does_not_write_fake_output(monkeypatch):
    import urllib.request
    def mock_urlopen(*args, **kwargs):
        raise urllib.error.URLError("Failed")
        
    monkeypatch.setattr(urllib.request, "urlopen", mock_urlopen)
    monkeypatch.setattr(GeminiProvider, "_image_to_part", lambda self, path: {"inlineData": {"mimeType": "image/jpeg", "data": "fake"}})
    
    os.environ["AI_API_KEY"] = "fake"
    os.environ["AI_MODEL"] = "gemini-3.5-flash"
    
    p = GeminiProvider()
    with pytest.raises(AIProviderError):
        p.review_claim("test", "car", ["/tmp/img1.jpg"], "history", "reqs")
