from fastapi import APIRouter

from app.api.v1.endpoints import accounting, cache, company, formula, metrics, screen, sync

api_router = APIRouter()


api_router.include_router(screen.router)
api_router.include_router(company.router)
api_router.include_router(metrics.router)
api_router.include_router(cache.router)
api_router.include_router(formula.router)
api_router.include_router(sync.router)
api_router.include_router(accounting.router)
