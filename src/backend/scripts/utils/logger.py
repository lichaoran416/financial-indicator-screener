import json
import logging
import sys
from datetime import datetime
from pathlib import Path


class SyncJsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, "sync_type"):
            log_data["sync_type"] = record.sync_type
        if hasattr(record, "industry_sw_three"):
            log_data["industry_sw_three"] = record.industry_sw_three
        if hasattr(record, "code"):
            log_data["code"] = record.code
        if hasattr(record, "progress"):
            log_data["progress"] = record.progress
        if record.exc_info:
            log_data["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(log_data, ensure_ascii=False)


def setup_sync_logger(
    name: str, log_dir: str = "logs", level: int = logging.INFO
) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.handlers.clear()

    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    file_handler = logging.FileHandler(log_path / "sync.log", encoding="utf-8")
    file_handler.setFormatter(SyncJsonFormatter())
    file_handler.setLevel(level)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s - %(name)s - %(levelname)s - %(message)s")
    )
    console_handler.setLevel(level)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger


def get_sync_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
