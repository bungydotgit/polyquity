from pydantic import BaseModel, Field
from typing import Optional,Dict, Any

class ChatTurnRequest(BaseModel):
    session_id: Optional[str] = None
    message: str = Field(min_length=1)

class ChatTurnResponse(BaseModel):
    session_id: str
    assistant_text: str

class IPOCreateRequest(BaseModel):
    company_name: str = Field(min_length=1)
    source_url: Optional[str] = None
    ipfs_cid: Optional[str] = None

class IPOCreateResponse(BaseModel):
    ipo_id: str
    status: str

class IPOEmbedRequest(BaseModel):
    ipfs_cid: str = Field(min_length=1)

class IPOEmbedResponse(BaseModel):
    job_id: str
    status: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class IPOJobResponse(BaseModel):
    job_id: str
    status: str
