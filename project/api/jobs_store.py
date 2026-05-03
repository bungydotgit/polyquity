from typing import Dict, Any, Optional
import secrets

JOBS: Dict[str, Dict[str, Any]] = {}

def new_job_id() -> str:
    return "j_" + secrets.token_hex(6)

def set_job(job_id: str, status: str, result: Optional[Dict[str, Any]] = None, error: Optional[str] = None) -> None:
    JOBS[job_id] = {"status": status, "result": result, "error": error}

def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    return JOBS.get(job_id)
