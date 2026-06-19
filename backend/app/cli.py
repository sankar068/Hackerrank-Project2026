import argparse
import getpass
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, AuditLog
from app.services.auth import get_password_hash
import sys

def create_admin(email: str, display_name: str, password: str, db: Session = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True
    try:
        # Check if email exists
        if db.query(User).filter(User.email == email.lower()).first():
            print(f"Error: A user with the email {email} already exists.")
            sys.exit(1)
            
        admin_user = User(
            email=email.lower(),
            username=email.lower(), # Fallback for username if not provided
            display_name=display_name,
            hashed_password=get_password_hash(password),
            role="admin",
            is_active=True
        )
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # Log audit
        audit = AuditLog(
            action="admin_created",
            actor_id=admin_user.id,
            actor_role="admin",
            reason="Admin bootstrap CLI"
        )
        db.add(audit)
        db.commit()
        
        print(f"Successfully created admin user: {email}")
    except Exception as e:
        print(f"Failed to create admin: {e}")
        db.rollback()
        sys.exit(1)
    finally:
        if close_db:
            db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Admin bootstrap CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    admin_parser = subparsers.add_parser("create-admin", help="Create an admin user")
    admin_parser.add_argument("--email", required=True, help="Admin email address")
    admin_parser.add_argument("--display-name", required=True, help="Admin display name")
    
    args = parser.parse_args()
    
    if args.command == "create-admin":
        password = getpass.getpass("Enter admin password: ")
        confirm_password = getpass.getpass("Confirm admin password: ")
        
        if password != confirm_password:
            print("Error: Passwords do not match.")
            sys.exit(1)
            
        if len(password) < 8:
            print("Error: Password must be at least 8 characters.")
            sys.exit(1)
            
        create_admin(args.email, args.display_name, password)
    else:
        parser.print_help()
