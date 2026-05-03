from fastapi import APIRouter, HTTPException
from api.schemas import JobStatusResponse
from api.jobs_store import get_job

router = APIRouter(prefix="/api/v1/jobs", tags=["jobs"])

@router.get("/{job_id}", response_model=JobStatusResponse)
def job_status(job_id: str) -> JobStatusResponse:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobStatusResponse(job_id=job_id, status=job["status"], result=job.get("result"), error=job.get("error"))
