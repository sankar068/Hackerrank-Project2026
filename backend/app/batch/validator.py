import csv
import os

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

def validate_output(input_claims_csv: str, output_csv: str):
    """
    Validates that output.csv meets all HackerRank requirements:
    - Same number of rows as input (excluding header)
    - Original first four fields preserved exactly
    - No missing or extra columns
    - Exact column ordering
    - Supported boolean formatting (true/false)
    - Valid enums and formats
    """
    if not os.path.exists(output_csv):
        raise ValueError(f"Output file {output_csv} does not exist.")
    
    # Read inputs to ensure we preserve exactly
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
            
            # 1. Preserve original first four fields exactly
            for field in ["user_id", "image_paths", "user_claim", "claim_object"]:
                if row_dict[field] != expected_input[field]:
                    raise ValueError(f"Row {row_idx + 1}: {field} changed from {expected_input[field]} to {row_dict[field]}")
            
            # 2. Boolean lowercase check
            for b_field in ["evidence_standard_met", "valid_image"]:
                if row_dict[b_field] not in ["true", "false"]:
                    raise ValueError(f"Row {row_idx + 1}: {b_field} must be lowercase 'true' or 'false', got '{row_dict[b_field]}'")
                    
            # 3. Enum validation
            if row_dict["claim_status"] not in ["approved", "denied", "manual_review", "not_enough_information"]:
                raise ValueError(f"Row {row_idx + 1}: Invalid claim_status '{row_dict['claim_status']}'")
            
            if row_dict["severity"] not in ["low", "medium", "high", "critical", "none"]:
                raise ValueError(f"Row {row_idx + 1}: Invalid severity '{row_dict['severity']}'")
                
            # 4. Risk Flags format check (none cannot be combined)
            flags = row_dict["risk_flags"].split(";")
            if "none" in flags and len(flags) > 1:
                raise ValueError(f"Row {row_idx + 1}: risk_flags cannot combine 'none' with other flags. Got: {row_dict['risk_flags']}")
            
            # 5. Supporting Image IDs validation
            # Must be a subset of the images provided in image_paths
            provided_images = expected_input["image_paths"].split(";")
            if row_dict["supporting_image_ids"] and row_dict["supporting_image_ids"] != "none":
                supporting = row_dict["supporting_image_ids"].split(";")
                for s_id in supporting:
                    if s_id.strip() == "":
                        continue
                    if s_id not in provided_images:
                        raise ValueError(f"Row {row_idx + 1}: supporting_image_ids '{s_id}' not in provided image_paths {provided_images}")
                        
            row_idx += 1
            
        if row_idx != len(inputs):
            raise ValueError(f"Output row count ({row_idx}) does not match input row count ({len(inputs)})")
            
    return True, "Output validation passed successfully!"
