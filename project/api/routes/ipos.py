from fastapi import APIRouter, BackgroundTasks, HTTPException
from api.schemas import IPOCreateRequest, IPOCreateResponse, IPOEmbedRequest, IPOEmbedResponse, IPOJobResponse
from api.jobs_store import new_job_id, set_job
from data_pipeline.extractor import run_ipo_pipeline, process_and_embed_prospectus

import uuid

router = APIRouter(prefix="/api/v1/ipos", tags=["ipos"])

def _run_pipeline_job(job_id: str, payload: IPOCreateRequest) -> None:
    try:
        set_job(job_id, "running")
        result = run_ipo_pipeline(payload.company_name, payload.source_url, payload.ipfs_cid)
        set_job(job_id, "completed", result=result)
    except Exception as e:
        set_job(job_id, "failed", error=str(e))



def _run_embedding_job(job_id: str, ipo_id: str, ipfs_cid: str) -> None:
    try:
        set_job(job_id, "running")
        result = process_and_embed_prospectus(ipfs_cid=ipfs_cid, ipo_id=ipo_id)
        set_job(job_id, "completed", result=result)
    except Exception as e:
        set_job(job_id, "failed", error=str(e))

@router.post("", response_model=IPOJobResponse, status_code=202)
def create_ipo(payload: IPOCreateRequest, background_tasks: BackgroundTasks) -> IPOJobResponse:
    job_id = new_job_id()
    set_job(job_id, "queued")
    background_tasks.add_task(_run_pipeline_job, job_id, payload)
    return IPOJobResponse(job_id=job_id, status="queued")


@router.post("/{ipo_id}/embeddings", response_model=IPOEmbedResponse)
def create_embeddings(ipo_id: str, payload: IPOEmbedRequest, background_tasks: BackgroundTasks) -> IPOEmbedResponse:
    job_id = new_job_id()
    set_job(job_id, "queued")
    background_tasks.add_task(_run_embedding_job, job_id, ipo_id, payload.ipfs_cid)
    return IPOEmbedResponse(job_id=job_id, status="queued")
