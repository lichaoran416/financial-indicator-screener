import asyncio
import json
import logging
import os
import sys
import time
import traceback
import uuid
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
from logging.handlers import TimedRotatingFileHandler
from typing import Any, Callable


SENSITIVE_KEYS = {
    "password",
    "token",
    "secret",
    "api_key",
    "authorization",
    "credential",
    "private_key",
}

SLOW_REQUEST_THRESHOLD_MS = 1000

request_id_var: ContextVar[str] = ContextVar("request_id", default="")


class AppJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "message": record.getMessage(),
        }

        if request_id_var.get():
            log_data["request_id"] = request_id_var.get()

        if hasattr(record, "type"):
            log_data["type"] = record.type
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path
        if hasattr(record, "params"):
            log_data["params"] = record.params
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "threshold_ms"):
            log_data["threshold_ms"] = record.threshold_ms
        if hasattr(record, "error_type"):
            log_data["error_type"] = record.error_type
        if hasattr(record, "error_message"):
            log_data["error_message"] = record.error_message
        if hasattr(record, "context"):
            log_data["context"] = record.context
        if hasattr(record, "operation"):
            log_data["operation"] = record.operation
        if hasattr(record, "symbol"):
            log_data["symbol"] = record.symbol
        if hasattr(record, "success"):
            log_data["success"] = record.success
        if hasattr(record, "error"):
            log_data["error"] = record.error

        if record.exc_info:
            log_data["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(log_data, ensure_ascii=False)


def mask_sensitive_data(data: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in data.items():
        if any(sensitive in key.lower() for sensitive in SENSITIVE_KEYS):
            result[key] = "***REDACTED***"
        elif isinstance(value, dict):
            result[key] = mask_sensitive_data(value)
        elif isinstance(value, list) and value and isinstance(value[0], dict):
            result[key] = [
                mask_sensitive_data(item) if isinstance(item, dict) else item for item in value
            ]
        else:
            result[key] = value
    return result


def get_request_id() -> str:
    return request_id_var.get()


def set_request_id(request_id: str) -> None:
    request_id_var.set(request_id)


def generate_request_id() -> str:
    return str(uuid.uuid4())


def setup_logging(log_dir: str = "logs", log_level: str = "INFO") -> None:
    os.makedirs(log_dir, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.INFO))

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.DEBUG)
    console_formatter = logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    console_handler.setFormatter(console_formatter)
    root_logger.addHandler(console_handler)

    file_handler = TimedRotatingFileHandler(
        os.path.join(log_dir, "app.log"),
        when="midnight",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(AppJsonFormatter())
    root_logger.addHandler(file_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)


def log_api_request(
    method: str,
    path: str,
    params: dict[str, Any] | None = None,
    request_id: str | None = None,
) -> None:
    logger = logging.getLogger("api")
    extra: dict[str, Any] = {
        "type": "api_request",
        "method": method,
        "path": path,
        "params": mask_sensitive_data(params) if params else None,
    }
    if request_id:
        extra["request_id"] = request_id
    elif request_id_var.get():
        extra["request_id"] = request_id_var.get()
    logger.info(f"API Request: {method} {path}", extra=extra)


def log_api_response(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    request_id: str | None = None,
) -> None:
    logger = logging.getLogger("api")
    extra: dict[str, Any] = {
        "type": "api_response",
        "method": method,
        "path": path,
        "status_code": status_code,
        "duration_ms": round(duration_ms, 2),
    }
    if request_id:
        extra["request_id"] = request_id
    elif request_id_var.get():
        extra["request_id"] = request_id_var.get()

    level = logging.INFO if status_code < 400 else logging.WARNING
    logger.log(
        level, f"API Response: {method} {path} - {status_code} ({duration_ms:.2f}ms)", extra=extra
    )

    if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
        log_slow_request(method, path, duration_ms, request_id)


def log_slow_request(
    method: str,
    path: str,
    duration_ms: float,
    request_id: str | None = None,
) -> None:
    logger = logging.getLogger("performance")
    extra: dict[str, Any] = {
        "type": "slow_request",
        "method": method,
        "path": path,
        "duration_ms": round(duration_ms, 2),
        "threshold_ms": SLOW_REQUEST_THRESHOLD_MS,
    }
    if request_id:
        extra["request_id"] = request_id
    elif request_id_var.get():
        extra["request_id"] = request_id_var.get()

    logger.warning(
        f"SLOW REQUEST ALERT: {method} {path} took {duration_ms:.2f}ms (threshold: {SLOW_REQUEST_THRESHOLD_MS}ms)",
        extra=extra,
    )


def log_error(
    error: Exception,
    context: str | None = None,
    request_id: str | None = None,
) -> None:
    logger = logging.getLogger("error")
    extra: dict[str, Any] = {
        "type": "error",
        "error_type": type(error).__name__,
        "error_message": str(error),
        "context": context,
    }
    if request_id:
        extra["request_id"] = request_id
    elif request_id_var.get():
        extra["request_id"] = request_id_var.get()

    exc_info = "".join(traceback.format_exception(type(error), error, error.__traceback__))
    logger.error(f"Error: {type(error).__name__}: {str(error)}\n{exc_info}", extra=extra)


def log_data_acquisition(
    operation: str,
    symbol: str | None = None,
    success: bool = True,
    duration_ms: float | None = None,
    request_id: str | None = None,
    error: str | None = None,
) -> None:
    logger = logging.getLogger("data")
    extra: dict[str, Any] = {
        "type": "data_acquisition",
        "operation": operation,
        "symbol": symbol,
        "success": success,
        "duration_ms": round(duration_ms, 2) if duration_ms else None,
        "error": error,
    }
    if request_id:
        extra["request_id"] = request_id
    elif request_id_var.get():
        extra["request_id"] = request_id_var.get()

    level = logging.INFO if success else logging.ERROR
    msg = (
        f"Data {operation}"
        + (f" for {symbol}" if symbol else "")
        + (" SUCCESS" if success else f" FAILED: {error}")
    )
    logger.log(level, msg, extra=extra)


def track_duration(func: Callable) -> Callable:
    @wraps(func)
    async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.perf_counter()
        try:
            result = await func(*args, **kwargs)
            return result
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
                log_slow_request(func.__name__, "internal", duration_ms)

    @wraps(func)
    def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
        start_time = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            duration_ms = (time.perf_counter() - start_time) * 1000
            if duration_ms > SLOW_REQUEST_THRESHOLD_MS:
                log_slow_request(func.__name__, "internal", duration_ms)

    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    return sync_wrapper
