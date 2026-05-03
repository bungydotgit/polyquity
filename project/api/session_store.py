from typing import Dict, Any
import secrets

SESSIONS: Dict[str, Dict[str, Any]] = {}

def new_session_id() -> str:
    return "s_" + secrets.token_hex(4)

def get_state(session_id: str) -> Dict[str, Any]:
    return SESSIONS.get(session_id, {})

def save_state(session_id: str, state: Dict[str, Any]) -> None:
    SESSIONS[session_id] = state
