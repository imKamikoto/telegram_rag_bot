from typing import Dict, List


class ChatHistory:

    def __init__(self, system_prompt: str, max_turns: int = 12) -> None:
        self.system_prompt = system_prompt
        self.max_turns = max_turns
        self._storage: Dict[int, List[Dict[str, str]]] = {}

    def reset(self, user_id: int) -> None:
        self._storage.pop(user_id, None)

    def _ensure(self, user_id: int) -> List[Dict[str, str]]:
        history = self._storage.get(user_id)
        if history is None:
            history = [{"role": "system", "content": self.system_prompt}]
            self._storage[user_id] = history
        return history

    def get(self, user_id: int) -> List[Dict[str, str]]:
        return self._ensure(user_id)

    def get_for_api(self, user_id: int) -> List[Dict[str, str]]:
        """Return only user/assistant turns (no system message) for the RAG API."""
        return [m for m in self._ensure(user_id) if m["role"] != "system"]

    def add_user(self, user_id: int, text: str) -> None:
        history = self._ensure(user_id)
        history.append({"role": "user", "content": text})
        self._trim(user_id)

    def add_assistant(self, user_id: int, text: str) -> None:
        history = self._ensure(user_id)
        history.append({"role": "assistant", "content": text})
        self._trim(user_id)

    def _trim(self, user_id: int) -> None:
        keep = 1 + 2 * self.max_turns
        history = self._storage.get(user_id)
        if history and len(history) > keep:
            self._storage[user_id] = [history[0]] + history[-(keep - 1):]
