"""MinIO (S3-compatible) storage for document files."""
from __future__ import annotations

import asyncio
import uuid
from urllib.parse import urlparse


class MinioStorage:
    def __init__(
        self,
        endpoint: str,
        access_key: str,
        secret_key: str,
        bucket: str,
        secure: bool = False,
        public_url: str | None = None,
    ) -> None:
        from minio import Minio  # type: ignore[import]

        self._client = Minio(endpoint, access_key=access_key, secret_key=secret_key, secure=secure)
        self._bucket = bucket

        # Separate client signed with the public hostname for presigned URLs
        if public_url:
            parsed = urlparse(public_url)
            self._presign_client = Minio(
                parsed.netloc,
                access_key=access_key,
                secret_key=secret_key,
                secure=parsed.scheme == "https",
            )
        else:
            self._presign_client = None

        self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        from minio.error import S3Error  # type: ignore[import]
        try:
            if not self._client.bucket_exists(self._bucket):
                self._client.make_bucket(self._bucket)
        except S3Error:
            pass

    def _build_key(self, file_name: str, knowledge_base_id: int | None) -> str:
        unique = uuid.uuid4().hex
        prefix = f"kb_{knowledge_base_id}" if knowledge_base_id is not None else "uncategorized"
        return f"documents/{prefix}/{unique}/{file_name}"

    async def upload_file(
        self,
        file_bytes: bytes,
        file_name: str,
        knowledge_base_id: int | None = None,
    ) -> str:
        import io
        key = self._build_key(file_name, knowledge_base_id)
        await asyncio.to_thread(
            self._client.put_object,
            self._bucket,
            key,
            io.BytesIO(file_bytes),
            length=len(file_bytes),
        )
        return key

    async def delete_file(self, s3_key: str) -> None:
        await asyncio.to_thread(self._client.remove_object, self._bucket, s3_key)

    async def get_presigned_url(self, s3_key: str, expires_seconds: int = 3600) -> str | None:
        if self._presign_client is None:
            return None
        from datetime import timedelta
        return await asyncio.to_thread(
            self._presign_client.presigned_get_object,
            self._bucket,
            s3_key,
            expires=timedelta(seconds=expires_seconds),
        )
