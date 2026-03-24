import uuid
from datetime import datetime
from typing import Any, Optional

from app.utils.formula_lexer import FormulaLexerError
from app.utils.formula_parser import ASTNode, FormulaParserError, parse, validate
from app.utils.formula_evaluator import FormulaEvaluatorError, evaluate
from app.core.config import settings
from app.core.redis import redis_manager


class FormulaServiceError(Exception):
    pass


class FormulaValidationError(Exception):
    def __init__(self, message: str, formula: str):
        self.message = message
        self.formula = formula
        super().__init__(f"Formula validation failed: {message}")


class Formula:
    def __init__(
        self,
        id: str,
        name: str,
        formula: str,
        description: Optional[str] = None,
        created_at: Optional[datetime] = None,
    ):
        self.id = id
        self.name = name
        self.formula = formula
        self.description = description
        self.created_at = created_at or datetime.utcnow()
        self._ast: Optional[ASTNode] = None
        self._validation_error: Optional[str] = None

    def validate(self) -> tuple[bool, Optional[str]]:
        if self._validation_error is not None:
            return False, self._validation_error

        valid, error = validate(self.formula)
        if not valid:
            self._validation_error = error
            return False, error

        try:
            self._ast = parse(self.formula)
        except (FormulaLexerError, FormulaParserError) as e:
            self._validation_error = str(e)
            return False, str(e)

        return True, None

    @property
    def ast(self) -> Optional[ASTNode]:
        if self._ast is None:
            valid, _ = self.validate()
            if not valid:
                raise FormulaServiceError(self._validation_error or "Invalid formula")
        return self._ast

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "formula": self.formula,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Formula":
        return cls(
            id=data.get("id", str(uuid.uuid4())),
            name=data.get("name", ""),
            formula=data.get("formula", ""),
            description=data.get("description"),
            created_at=datetime.fromisoformat(data["created_at"])
            if data.get("created_at")
            else datetime.utcnow(),
        )


class FormulaService:
    FORMULAS_KEY = "custom_formulas"

    async def validate_formula(
        self, formula: str
    ) -> tuple[bool, Optional[str], Optional[dict[str, Any]]]:
        valid, error = validate(formula)
        if not valid:
            return False, error, None

        try:
            ast = parse(formula)
            return True, None, {"ast": str(ast)}
        except (FormulaLexerError, FormulaParserError) as e:
            return False, str(e), None

    async def evaluate_formula(
        self,
        formula: str,
        metrics_data: dict[str, Any],
    ) -> tuple[bool, Optional[str], Optional[float]]:
        valid, error, _ = await self.validate_formula(formula)
        if not valid:
            return False, error, None

        try:
            ast = parse(formula)
            result = evaluate(ast, metrics_data)
            return True, None, result
        except FormulaEvaluatorError as e:
            return False, str(e), None

    async def save_formula(
        self,
        name: str,
        formula: str,
        description: Optional[str] = None,
    ) -> tuple[bool, Optional[str], Optional[Formula]]:
        valid, error, _ = await self.validate_formula(formula)
        if not valid:
            return False, error, None

        custom_formula = Formula(
            id=str(uuid.uuid4()),
            name=name,
            formula=formula,
            description=description,
        )

        existing = await redis_manager.get_json(self.FORMULAS_KEY) or []
        existing.append(custom_formula.to_dict())
        await redis_manager.set_json(self.FORMULAS_KEY, existing, ttl=settings.CACHE_TTL)

        return True, None, custom_formula

    async def get_formulas(self) -> list[Formula]:
        data = await redis_manager.get_json(self.FORMULAS_KEY) or []
        return [Formula.from_dict(item) for item in data]

    async def get_formula(self, formula_id: str) -> Optional[Formula]:
        formulas = await self.get_formulas()
        for formula in formulas:
            if formula.id == formula_id:
                return formula
        return None

    async def delete_formula(self, formula_id: str) -> bool:
        existing = await redis_manager.get_json(self.FORMULAS_KEY) or []
        updated = [f for f in existing if f.get("id") != formula_id]
        if len(updated) == len(existing):
            return False
        await redis_manager.set_json(self.FORMULAS_KEY, updated, ttl=settings.CACHE_TTL)
        return True

    async def update_formula(
        self,
        formula_id: str,
        name: Optional[str] = None,
        formula: Optional[str] = None,
        description: Optional[str] = None,
    ) -> tuple[bool, Optional[str], Optional[Formula]]:
        existing = await redis_manager.get_json(self.FORMULAS_KEY) or []

        for i, item in enumerate(existing):
            if item.get("id") == formula_id:
                if name is not None:
                    item["name"] = name
                if description is not None:
                    item["description"] = description
                if formula is not None:
                    valid, error, _ = await self.validate_formula(formula)
                    if not valid:
                        return False, error, None
                    item["formula"] = formula

                existing[i] = item
                await redis_manager.set_json(self.FORMULAS_KEY, existing, ttl=settings.CACHE_TTL)

                return True, None, Formula.from_dict(item)

        return False, "Formula not found", None


formula_service = FormulaService()
