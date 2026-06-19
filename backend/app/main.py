from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app import models
from app.api import auth, claims, admin

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Set up CORS
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(claims.router, prefix="/api/claims", tags=["claims"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/")
def read_root():
    return {"message": f"Welcome to {settings.PROJECT_NAME} API"}

@app.get("/api/health")
def health_check():
    return {"status": "ok"}
