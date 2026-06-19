import os
import time
import json
import urllib.request
import urllib.error
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class AIProviderError(Exception):
    pass

class RateLimitError(AIProviderError):
    pass

class GeminiProvider:
    def __init__(self):
        self.provider = os.getenv("AI_PROVIDER", "gemini")
        self.model = os.getenv("AI_MODEL", "gemini-1.5-flash")
        self.api_key = os.getenv("AI_API_KEY")
        self.base_url = os.getenv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/models")
        
        if not self.api_key:
            logger.warning("AI_API_KEY is not set. Provider calls will fail.")

    def _call_api_with_retry(self, payload: Dict[str, Any], max_retries: int = 4) -> Dict[str, Any]:
        if not self.api_key:
            raise AIProviderError("AI_API_KEY is missing")
            
        url = f"{self.base_url}/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        data = json.dumps(payload).encode("utf-8")
        
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        
        delay = 1.0
        for attempt in range(max_retries):
            try:
                with urllib.request.urlopen(req, timeout=30.0) as response:
                    return json.loads(response.read().decode("utf-8"))
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8")
                if e.code == 429:
                    logger.warning(f"Rate limited. Retrying in {delay}s...")
                    time.sleep(delay)
                    delay *= 2.0
                    continue
                else:
                    logger.error(f"API Error {e.code}: {body}")
                    raise AIProviderError(f"HTTP {e.code}: {body}")
            except urllib.error.URLError as e:
                logger.warning(f"Network error: {e.reason}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2.0
            except Exception as e:
                raise AIProviderError(str(e))
                
        raise AIProviderError(f"Failed after {max_retries} attempts.")

    def _image_to_part(self, image_path: str) -> Dict[str, str]:
        # Very simple base64 reading
        import base64
        import mimetypes
        mime_type, _ = mimetypes.guess_type(image_path)
        if not mime_type:
            mime_type = "image/jpeg"
            
        with open(image_path, "rb") as f:
            b64_data = base64.b64encode(f.read()).decode("utf-8")
            
        return {
            "inlineData": {
                "mimeType": mime_type,
                "data": b64_data
            }
        }

    def review_claim(
        self,
        user_claim: str,
        claim_object: str,
        image_paths: List[str],
        history_context: str,
        requirements_context: str
    ) -> Dict[str, Any]:
        """
        Stage A & B combined for simplicity in API call, using Structured Outputs if available,
        or careful JSON formatting instructions.
        """
        prompt = f"""
        You are an expert insurance AI reviewer for {claim_object}.
        User Claim: "{user_claim}"
        
        User History: {history_context}
        Evidence Requirements: {requirements_context}
        
        Review the provided images to verify the claim.
        Rules:
        1. Images are the primary source of truth.
        2. User history adds risk context but cannot override clear images.
        3. If correct part is clearly visible and damage is absent -> contradicted.
        4. If correct part not visible -> not_enough_information.
        5. Provide short justification referencing visible evidence.
        6. Identify which images support the claim by index (0-based) or name.
        
        Output MUST be valid JSON matching exactly this schema, no markdown blocks:
        {{
            "evidence_standard_met": "true" or "false",
            "evidence_standard_met_reason": "string",
            "risk_flags": "none or semicolon separated list",
            "issue_type": "string",
            "object_part": "string",
            "claim_status": "approved|denied|manual_review|not_enough_information",
            "claim_status_justification": "string",
            "supporting_image_indexes": [list of ints],
            "valid_image": "true" or "false",
            "severity": "low|medium|high|critical|none"
        }}
        """
        
        parts = [{"text": prompt}]
        for path in image_paths:
            parts.append(self._image_to_part(path))
            
        payload = {
            "contents": [{"parts": parts}],
            "generationConfig": {
                "temperature": 0.1,
                "responseMimeType": "application/json"
            }
        }
        
        resp = self._call_api_with_retry(payload)
        
        try:
            text = resp["candidates"][0]["content"]["parts"][0]["text"]
            result = json.loads(text)
            
            # Map supporting indexes back to IDs
            supported_ids = []
            for idx in result.get("supporting_image_indexes", []):
                if 0 <= idx < len(image_paths):
                    supported_ids.append(os.path.basename(image_paths[idx]))
                    
            if not supported_ids:
                sup_str = "none"
            else:
                sup_str = ";".join(supported_ids)
                
            return {
                "evidence_standard_met": str(result.get("evidence_standard_met", "false")).lower(),
                "evidence_standard_met_reason": result.get("evidence_standard_met_reason", ""),
                "risk_flags": result.get("risk_flags", "none"),
                "issue_type": result.get("issue_type", "unknown"),
                "object_part": result.get("object_part", "unknown"),
                "claim_status": result.get("claim_status", "manual_review"),
                "claim_status_justification": result.get("claim_status_justification", ""),
                "supporting_image_ids": sup_str,
                "valid_image": str(result.get("valid_image", "false")).lower(),
                "severity": result.get("severity", "none")
            }
        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}")
            raise AIProviderError("Failed to parse valid JSON from AI provider")

def get_ai_provider():
    return GeminiProvider()
