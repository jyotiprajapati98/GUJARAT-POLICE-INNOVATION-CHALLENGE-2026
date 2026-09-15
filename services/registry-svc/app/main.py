from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import engine, SessionLocal, Base
from app.routers import auth, departments, users, cameras, gis
from app.routers import integration, audit, health, gap_analysis
from app.middleware.audit_middleware import AuditMiddleware


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db_session() -> Session:
    return SessionLocal()


app = FastAPI(
    title="CCTV Registry API",
    description="Centralised CCTV Asset Registry for Smart City Operations",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(AuditMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    create_tables()
    db = get_db_session()
    try:
        from app.utils.seed import seed_database
        from app.models.department import Department
        if not db.query(Department).first():
            seed_database(db)
    except Exception as e:
        print(f"Seeding error: {e}")
    finally:
        db.close()


app.include_router(auth.router, prefix="/api/v1")
app.include_router(departments.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(cameras.router, prefix="/api/v1")
app.include_router(gis.router, prefix="/api/v1")
app.include_router(integration.router, prefix="/api/v1")
app.include_router(audit.router, prefix="/api/v1")
app.include_router(health.router, prefix="/api/v1")
app.include_router(gap_analysis.router, prefix="/api/v1")


@app.get("/")
async def root():
    return {
        "message": "CCTV Registry API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
