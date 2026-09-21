# backend/main.py
import os
import uvicorn
from fastapi import FastAPI, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Optional
from dotenv import load_dotenv

load_dotenv(override=True)

from chitti_router import (
    router as chitti_router,
    list_chittis,
    get_chitti_details,
    verify_manager,
    ManagerVerifyRequest
)

app = FastAPI(
    title="ClearFlow Small Chits API",
    description="FastAPI Backend for 20-Month Incremental Chit Fund Automation with NocoDB integration and Strict Tenant Isolation",
    version="2.1.0"
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount primary incremental chitti router
app.include_router(chitti_router)

# Aliases for manager verification (The Bouncer)
@app.post("/api/v2/auth/verify-manager")
@app.post("/api/auth/verify-manager")
async def alias_verify_manager(req: ManagerVerifyRequest):
    return await verify_manager(req)

# Also support direct /api/chittis aliases with strict tenant isolation
@app.get("/api/chittis")
async def alias_list_chittis(request: Request, manager_id: Optional[str] = Query(None)):
    return await list_chittis(request, manager_id)

@app.get("/api/chittis/{chitti_id}")
async def alias_get_chitti(chitti_id: str, request: Request, manager_id: Optional[str] = Query(None)):
    return await get_chitti_details(chitti_id, request, manager_id)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "ClearFlow FastAPI NocoDB Engine with Bouncer & Strict Tenant Isolation",
        "port": int(os.getenv("FASTAPI_PORT", "8001"))
    }

if __name__ == "__main__":
    port = int(os.getenv("FASTAPI_PORT", os.getenv("BACKEND_PORT", "8001")))
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")
