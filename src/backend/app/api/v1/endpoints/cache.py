from fastapi import APIRouter, HTTPException
from app.core.redis import redis_manager

router = APIRouter()


@router.post("/cache/refresh")
async def refresh_cache():
    try:
        if redis_manager._client is None:
            raise HTTPException(status_code=500, detail="Redis client not initialized")
        
        keys = await redis_manager._client.keys("*")
        if keys:
            await redis_manager._client.delete(*keys)
        
        return {"status": "success", "message": f"Cache refreshed, cleared {len(keys)} keys"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
