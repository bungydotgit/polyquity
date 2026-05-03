from fastapi import APIRouter, HTTPException
from api.schemas import ChatTurnRequest, ChatTurnResponse
from api.session_store import new_session_id, get_state, save_state
from agents.recommendation_agent import run_turn

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])

@router.post("/turn", response_model=ChatTurnResponse)
def chat_turn(payload: ChatTurnRequest) -> ChatTurnResponse:
    session_id = payload.session_id or new_session_id()
    state = get_state(session_id)

    try:
        assistant_text, new_state = run_turn(state, payload.message)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    save_state(session_id, new_state)
    return ChatTurnResponse(session_id=session_id, assistant_text=assistant_text)
