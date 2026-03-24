from fastapi import APIRouter, HTTPException
from app.core.redis import redis_manager

router = APIRouter()


@router.post("/cache/refresh")
async def refresh_cache():
    try:
        if redis_manager._client is None:
            raise HTTPException(status_code=500, detail="Redis client not initialized")

        deleted_count = 0
        async for key in redis_manager._client.scan_iter("*"):
            await redis_manager._client.delete(key)
            deleted_count += 1

        return {"status": "success", "message": f"Cache refreshed, cleared {deleted_count} keys"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
