```md
bot_app/             # bot app
├── main.py          # aiogram / ptb entrypoint
├── config.py
├── bot/
│   ├── handlers/
│   ├── middlewares/
│   └── states.py

rag_app/             # rag_app
├── api/             # HTTP слой (FastAPI)
│   └── v1/
│       └── endpoints/
│           ├── ask.py
│           ├── ingest.py
│           └── health.py

├── rag/             # логика RAG
│   ├── pipeline.py
│   ├── retriever.py
│   ├── chunking.py
│   ├── prompts.py

├── storage/         # инфраструктура хранения
│   ├── vector/
│   │   ├── base.py
│   │   ├── qdrant.py
│   │   └── chroma.py
│   ├── cache.py
│   └── files.py

├── db/              # метаданные, версии, пользователи
│   ├── models.py
│   └── session.py
```