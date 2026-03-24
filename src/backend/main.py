import time
from contextlib import asynccontextmanager
from typing import Callable

import redis.asyncio as redis
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.v1.router import api_router
from app.core import logging as app_logging
from app.core.redis import redis_manager


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        request_id = app_logging.generate_request_id()
        app_logging.set_request_id(request_id)

        start_time = time.perf_counter()

        request.state.request_id = request_id
        request.state.start_time = start_time

        app_logging.log_api_request(
            method=request.method,
            path=request.url.path,
            params=dict(request.query_params) if request.query_params else None,
            request_id=request_id,
        )

        try:
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start_time) * 1000

            app_logging.log_api_response(
                method=request.method,
                path=request.url.path,
                status_code=response.status_code,
                duration_ms=duration_ms,
                request_id=request_id,
            )

            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            app_logging.log_error(
                error=e,
                context=f"{request.method} {request.url.path}",
                request_id=request_id,
            )
            app_logging.log_api_response(
                method=request.method,
                path=request.url.path,
                status_code=500,
                duration_ms=duration_ms,
                request_id=request_id,
            )
            raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    app_logging.setup_logging(log_dir="logs", log_level="INFO")
    app.state.redis = redis.Redis(host="localhost", port=6379, decode_responses=True)
    redis_manager._client = app.state.redis
    yield
    await app.state.redis.close()


app = FastAPI(title="Stock Analysis API", lifespan=lifespan)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
