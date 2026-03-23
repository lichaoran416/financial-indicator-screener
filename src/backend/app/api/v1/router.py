from fastapi import APIRouter

from app.api.v1.endpoints import cache, company, metrics, screen

api_router = APIRouter()


api_router.include_router(screen.router)
api_router.include_router(company.router)
api_router.include_router(metrics.router)
api_router.include_router(cache.router)
