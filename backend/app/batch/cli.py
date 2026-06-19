import argparse
import csv
import os
import sys
import tempfile
import shutil
import logging
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def load_csv_to_dict(filepath: str, key_col: str) -> Dict[str, Dict[str, str]]:
    data = {}
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            data[row[key_col]] = row
    return data

def run_batch(claims_file: str, history_file: str, req_file: str, images_root: str, output_file: str):
    from app.batch.ai_provider import get_ai_provider
    from app.batch.validator import REQUIRED_COLUMNS, validate_output
    
    logger.info("Starting batch processing...")
    
    history_data = load_csv_to_dict(history_file, "user_id")
    req_data = load_csv_to_dict(req_file, "claim_object")
    
    provider = get_ai_provider()
    
    temp_fd, temp_path = tempfile.mkstemp(suffix=".csv", text=True)
    
    try:
        with os.fdopen(temp_fd, 'w', encoding='utf-8', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=REQUIRED_COLUMNS)
            writer.writeheader()
            
            with open(claims_file, 'r', encoding='utf-8') as cf:
                reader = csv.DictReader(cf)
                for row in reader:
                    user_id = row["user_id"]
                    claim_obj = row["claim_object"]
                    user_claim = row["user_claim"]
                    image_paths_raw = row["image_paths"]
                    
                    images = []
                    if image_paths_raw and image_paths_raw != "none":
                        for p in image_paths_raw.split(";"):
                            if p.strip():
                                full_path = os.path.join(images_root, p.strip())
                                images.append(full_path)
                    
                    # Lookups
                    history_row = history_data.get(user_id, {})
                    history_ctx = f"Account Age: {history_row.get('account_age_days', 'unknown')}, " \\
                                  f"Past Claims: {history_row.get('past_claims_count', 'unknown')}, " \\
                                  f"Flags: {history_row.get('account_flags', 'none')}"
                                  
                    req_row = req_data.get(claim_obj, {})
                    req_ctx = f"Required: {req_row.get('required_evidence', 'unknown')}, " \\
                              f"Standard: {req_row.get('evidence_standard', 'unknown')}"
                              
                    # Run AI
                    try:
                        ai_res = provider.review_claim(
                            user_claim=user_claim,
                            claim_object=claim_obj,
                            image_paths=images,
                            history_context=history_ctx,
                            requirements_context=req_ctx
                        )
                    except Exception as e:
                        logger.error(f"Error processing {user_id}: {e}")
                        # Fallback row if AI completely fails
                        ai_res = {
                            "evidence_standard_met": "false",
                            "evidence_standard_met_reason": str(e),
                            "risk_flags": "none",
                            "issue_type": "unknown",
                            "object_part": "unknown",
                            "claim_status": "manual_review",
                            "claim_status_justification": "AI failure",
                            "supporting_image_ids": "none",
                            "valid_image": "false",
                            "severity": "none"
                        }
                    
                    # Merge outputs
                    out_row = {
                        "user_id": user_id,
                        "image_paths": image_paths_raw,
                        "user_claim": user_claim,
                        "claim_object": claim_obj,
                        **ai_res
                    }
                    writer.writerow(out_row)
                    
        # Validate temp file against input
        logger.info("Validating output against official rules...")
        is_valid, msg = validate_output(claims_file, temp_path)
        if is_valid:
            logger.info("Validation passed. Atomically moving output file.")
            shutil.move(temp_path, output_file)
        else:
            logger.error("Validation failed! Not moving output file.")
            sys.exit(1)
            
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def main():
    parser = argparse.ArgumentParser(prog="batch_pipeline")
    subparsers = parser.add_subparsers(dest="command")
    
    inspect_parser = subparsers.add_parser("inspect")
    inspect_parser.add_argument("--claims", required=True)
    inspect_parser.add_argument("--history", required=True)
    inspect_parser.add_argument("--requirements", required=True)
    
    run_parser = subparsers.add_parser("run")
    run_parser.add_argument("--claims", required=True)
    run_parser.add_argument("--history", required=True)
    run_parser.add_argument("--requirements", required=True)
    run_parser.add_argument("--images-root", required=True)
    run_parser.add_argument("--output", required=True)
    
    val_parser = subparsers.add_parser("validate-output")
    val_parser.add_argument("--claims", required=True)
    val_parser.add_argument("--output", required=True)
    
    args = parser.parse_args()
    
    if args.command == "inspect":
        print("Inspecting...")
        print(f"Claims: {args.claims}")
        print(f"History: {args.history}")
        print(f"Requirements: {args.requirements}")
    elif args.command == "run":
        run_batch(args.claims, args.history, args.requirements, args.images_root, args.output)
    elif args.command == "validate-output":
        from app.batch.validator import validate_output
        is_valid, msg = validate_output(args.claims, args.output)
        if is_valid:
            print(msg)

if __name__ == "__main__":
    main()
