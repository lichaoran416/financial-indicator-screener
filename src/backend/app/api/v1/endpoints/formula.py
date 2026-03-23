from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.formula_service import formula_service


router = APIRouter(prefix="/formula", tags=["formula"])


class FormulaValidateRequest(BaseModel):
    formula: str = Field(..., description="Formula string to validate")


class FormulaEvaluateRequest(BaseModel):
    formula: str = Field(..., description="Formula string to evaluate")
    metrics: dict[str, Any] = Field(..., description="Financial metrics data")


class FormulaSaveRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Formula name")
    formula: str = Field(..., description="Formula string")
    description: Optional[str] = Field(None, description="Formula description")


class FormulaResponse(BaseModel):
    id: str
    name: str
    formula: str
    description: Optional[str] = None
    created_at: Optional[str] = None


class FormulaValidateResponse(BaseModel):
    valid: bool
    error: Optional[str] = None
    ast: Optional[dict[str, Any]] = None


class FormulaEvaluateResponse(BaseModel):
    success: bool
    error: Optional[str] = None
    result: Optional[float] = None


@router.post("/validate", response_model=FormulaValidateResponse)
async def validate_formula(request: FormulaValidateRequest) -> FormulaValidateResponse:
    """
    Validate a formula string for syntax correctness.
    """
    valid, error, ast_info = await formula_service.validate_formula(request.formula)
    return FormulaValidateResponse(
        valid=valid,
        error=error,
        ast=ast_info,
    )


@router.post("/evaluate", response_model=FormulaEvaluateResponse)
async def evaluate_formula(request: FormulaEvaluateRequest) -> FormulaEvaluateResponse:
    """
    Evaluate a formula against provided financial metrics.
    """
    success, error, result = await formula_service.evaluate_formula(
        request.formula,
        request.metrics,
    )
    return FormulaEvaluateResponse(
        success=success,
        error=error,
        result=result,
    )


@router.post("/save", response_model=FormulaResponse)
async def save_formula(request: FormulaSaveRequest) -> FormulaResponse:
    """
    Save a custom formula for later use.
    """
    success, error, formula = await formula_service.save_formula(
        name=request.name,
        formula=request.formula,
        description=request.description,
    )

    if not success:
        raise HTTPException(status_code=400, detail=error or "Failed to save formula")

    return FormulaResponse(
        id=formula.id,
        name=formula.name,
        formula=formula.formula,
        description=formula.description,
        created_at=formula.created_at.isoformat() if formula.created_at else None,
    )


@router.get("/saved", response_model=list[FormulaResponse])
async def get_saved_formulas() -> list[FormulaResponse]:
    """
    Get all saved custom formulas.
    """
    formulas = await formula_service.get_formulas()
    return [
        FormulaResponse(
            id=f.id,
            name=f.name,
            formula=f.formula,
            description=f.description,
            created_at=f.created_at.isoformat() if f.created_at else None,
        )
        for f in formulas
    ]


@router.delete("/{formula_id}")
async def delete_formula(formula_id: str) -> dict[str, bool]:
    """
    Delete a saved formula by ID.
    """
    deleted = await formula_service.delete_formula(formula_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Formula not found")
    return {"deleted": True}
