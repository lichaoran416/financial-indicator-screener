import json
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, cast


class CheckpointManager:
    def __init__(self, checkpoint_dir: str = "checkpoints"):
        self.checkpoint_dir = Path(checkpoint_dir)
        self.checkpoint_dir.mkdir(parents=True, exist_ok=True)

    def _get_checkpoint_path(self, sync_type: str, date: Optional[str] = None) -> Path:
        if date is None:
            date = datetime.now().strftime("%Y%m%d")
        return self.checkpoint_dir / f"sync_{sync_type}_{date}.json"

    def save_checkpoint(
        self,
        sync_type: str,
        data: dict[str, Any],
        date: Optional[str] = None,
    ) -> None:
        checkpoint_path = self._get_checkpoint_path(sync_type, date)
        temp_path = checkpoint_path.with_suffix(".tmp")
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)
        temp_path.replace(checkpoint_path)

    def load_checkpoint(
        self,
        sync_type: str,
        date: Optional[str] = None,
    ) -> Optional[dict[str, Any]]:
        checkpoint_path = self._get_checkpoint_path(sync_type, date)
        if not checkpoint_path.exists():
            return None
        with open(checkpoint_path, "r", encoding="utf-8") as f:
            return cast(dict[str, Any], json.load(f))

    def get_latest_checkpoint(self, sync_type: str) -> Optional[dict[str, Any]]:
        pattern = f"sync_{sync_type}_*.json"
        matching_files = list(self.checkpoint_dir.glob(pattern))
        if not matching_files:
            return None
        latest_file = max(matching_files, key=lambda p: p.stat().st_mtime)
        with open(latest_file, "r", encoding="utf-8") as f:
            return cast(dict[str, Any], json.load(f))

    def clear_checkpoint(self, sync_type: str, date: Optional[str] = None) -> None:
        checkpoint_path = self._get_checkpoint_path(sync_type, date)
        if checkpoint_path.exists():
            checkpoint_path.unlink()
