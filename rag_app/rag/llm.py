import aiohttp
from typing import List


class OllamaClient:
    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def chat(self, message) -> str:
        payload = {
            "model": self.model,
            "messages": message,
            "stream": False,
        }

        timeout = aiohttp.ClientTimeout(total=180)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(f"{self.base_url}/api/chat", json=payload) as resp:
                if resp.status != 200:
                    text = await resp.text()
                    raise RuntimeError(f"Ollama error {resp.status}: {text}")
                data = await resp.json()

        answer = data.get("message", {}).get("content", "").strip()
        return answer or "(пустой ответ от модели)"