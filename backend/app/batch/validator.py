import csv
import os
from pathlib import Path

REQUIRED_COLUMNS = [
    "user_id",
    "image_paths",
    "user_claim",
    "claim_object",
    "evidence_standard_met",
    "evidence_standard_met_reason",
    "risk_flags",
    "issue_type",
    "object_part",
    "claim_status",
    "claim_status_justification",
    "supporting_image_ids",
    "valid_image",
    "severity"
]

VALID_CLAIM_STATUSES = {"supported", "contradicted", "not_enough_information"}
VALID_SEVERITIES = {"none", "low", "medium", "high", "unknown"}
VALID_ISSUE_TYPES = {"dent", "scratch", "crack", "glass_shatter", "broken_part", "missing_part", "torn_packaging", "crushed_packaging", "water_damage", "stain", "none", "unknown"}

CAR_PARTS = {"front_bumper", "rear_bumper", "door", "hood", "windshield", "side_mirror", "headlight", "taillight", "fender", "quarter_panel", "body", "unknown"}
LAPTOP_PARTS = {"screen", "keyboard", "trackpad", "hinge", "lid", "corner", "port", "base", "body", "unknown"}
PACKAGE_PARTS = {"box", "package_corner", "package_side", "seal", "label", "contents", "item", "unknown"}

VALID_RISK_FLAGS = {
    "none", "blurry_image", "cropped_or_obstructed", "low_light_or_glare", "wrong_angle", 
    "wrong_object", "wrong_object_part", "damage_not_visible", "claim_mismatch", 
    "possible_manipulation", "non_original_image", "text_instruction_present", 
    "user_history_risk", "manual_review_required"
}

def validate_output(input_claims_csv: str, output_csv: str):
    if not os.path.exists(output_csv):
        raise ValueError(f"Output file {output_csv} does not exist.")
    
    inputs = []
    with open(input_claims_csv, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            inputs.append({
                "user_id": row["user_id"],
                "image_paths": row["image_paths"],
                "user_claim": row["user_claim"],
                "claim_object": row["claim_object"],
            })
            
    with open(output_csv, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)
        
        if headers != REQUIRED_COLUMNS:
            raise ValueError(f"Output columns are incorrect.\\nExpected: {REQUIRED_COLUMNS}\\nGot: {headers}")
            
        row_idx = 0
        for row in reader:
            if len(row) != len(REQUIRED_COLUMNS):
                raise ValueError(f"Row {row_idx + 1} has incorrect number of columns: {len(row)} instead of {len(REQUIRED_COLUMNS)}")
            
            row_dict = dict(zip(headers, row))
            expected_input = inputs[row_idx]
            
            # 1. Exact preservation of first four fields
            for field in ["user_id", "image_paths", "user_claim", "claim_object"]:
                if row_dict[field] != expected_input[field]:
                    raise ValueError(f"Row {row_idx + 1}: {field} changed from {expected_input[field]} to {row_dict[field]}")
            
            # 2. Lowercase boolean serialization
            for b_field in ["evidence_standard_met", "valid_image"]:
                if row_dict[b_field] not in ["true", "false"]:
                    raise ValueError(f"Row {row_idx + 1}: {b_field} must be lowercase 'true' or 'false', got '{row_dict[b_field]}'")
                    
            # 3. Enum validation
            if row_dict["claim_status"] not in VALID_CLAIM_STATUSES:
                raise ValueError(f"Row {row_idx + 1}: Invalid claim_status '{row_dict['claim_status']}'")
            
            if row_dict["severity"] not in VALID_SEVERITIES:
                raise ValueError(f"Row {row_idx + 1}: Invalid severity '{row_dict['severity']}'")
                
            if row_dict["issue_type"] not in VALID_ISSUE_TYPES:
                raise ValueError(f"Row {row_idx + 1}: Invalid issue_type '{row_dict['issue_type']}'")
                
            # Object-part compatibility
            obj_part = row_dict["object_part"]
            c_obj = row_dict["claim_object"].lower()
            if c_obj == "car":
                if obj_part not in CAR_PARTS:
                    raise ValueError(f"Row {row_idx + 1}: Object part '{obj_part}' not valid for car")
            elif c_obj == "laptop":
                if obj_part not in LAPTOP_PARTS:
                    raise ValueError(f"Row {row_idx + 1}: Object part '{obj_part}' not valid for laptop")
            elif c_obj == "package":
                if obj_part not in PACKAGE_PARTS:
                    raise ValueError(f"Row {row_idx + 1}: Object part '{obj_part}' not valid for package")
                
            # 4. Risk Flags format check (none cannot be combined)
            flags = row_dict["risk_flags"].split(";")
            for flag in flags:
                if flag.strip() not in VALID_RISK_FLAGS:
                    raise ValueError(f"Row {row_idx + 1}: Invalid risk flag '{flag.strip()}'")
            
            if "none" in flags and len(flags) > 1:
                raise ValueError(f"Row {row_idx + 1}: risk_flags cannot combine 'none' with other flags. Got: {row_dict['risk_flags']}")
            
            # 5. Supporting IDs use filenames without extensions and belong to row
            provided_paths = expected_input["image_paths"].split(";") if expected_input["image_paths"] and expected_input["image_paths"] != "none" else []
            provided_stems = [Path(p).stem for p in provided_paths if p.strip()]
            
            supp_ids_str = row_dict["supporting_image_ids"]
            if not provided_stems and supp_ids_str != "none":
                raise ValueError(f"Row {row_idx + 1}: supporting_image_ids must be 'none' when no images provided")
                
            if supp_ids_str and supp_ids_str != "none":
                supporting = supp_ids_str.split(";")
                for s_id in supporting:
                    s_id = s_id.strip()
                    if not s_id:
                        continue
                    if "." in s_id:
                        raise ValueError(f"Row {row_idx + 1}: supporting_image_ids '{s_id}' contains an extension")
                    if s_id not in provided_stems:
                        raise ValueError(f"Row {row_idx + 1}: supporting_image_ids '{s_id}' not found in provided image stems {provided_stems}")
                        
            # No missing values in required generated fields
            for key in REQUIRED_COLUMNS:
                if row_dict[key] is None or row_dict[key].strip() == "":
                    raise ValueError(f"Row {row_idx + 1}: Column '{key}' cannot be empty")
                    
            row_idx += 1
            
        if row_idx != len(inputs):
            raise ValueError(f"Output row count ({row_idx}) does not match input row count ({len(inputs)})")
            
    return True, "Output validation passed successfully!"
