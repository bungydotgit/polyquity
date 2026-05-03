from fastapi import FastAPI
from api.routes.chat import router as chat_router
from api.routes.ipos import router as ipos_router
from api.routes.jobs import router as jobs_router

app = FastAPI(title="Polyquity MVP API")
app.include_router(chat_router)
app.include_router(ipos_router)
app.include_router(jobs_router)




@app.get("/health")
def health():
    return {"status": "ok"}
