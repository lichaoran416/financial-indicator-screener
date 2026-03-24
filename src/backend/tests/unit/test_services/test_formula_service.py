import pytest
from unittest.mock import patch, AsyncMock
from app.services.formula_service import FormulaService, Formula, formula_service
from app.core.redis import RedisManager


class TestFormulaServiceValidate:
    @pytest.mark.asyncio
    async def test_validate_formula_valid(self, mock_redis):
        service = FormulaService()
        valid, error, ast_info = await service.validate_formula("roe + roi")
        assert valid is True
        assert error is None
        assert ast_info is not None

    @pytest.mark.asyncio
    async def test_validate_formula_invalid(self, mock_redis):
        service = FormulaService()
        valid, error, ast_info = await service.validate_formula("roe +")
        assert valid is False
        assert error is not None
        assert ast_info is None

    @pytest.mark.asyncio
    async def test_validate_formula_complex(self, mock_redis):
        service = FormulaService()
        valid, error, ast_info = await service.validate_formula("(roe + roi) * 2")
        assert valid is True
        assert error is None


class TestFormulaServiceEvaluate:
    @pytest.mark.asyncio
    async def test_evaluate_formula(self, mock_redis):
        service = FormulaService()
        valid, error, result = await service.evaluate_formula(
            "roe + roi", {"roe": 10.0, "roi": 5.0}
        )
        assert valid is True
        assert error is None
        assert result == 15.0

    @pytest.mark.asyncio
    async def test_evaluate_formula_invalid(self, mock_redis):
        service = FormulaService()
        valid, error, result = await service.evaluate_formula("roe +", {"roe": 10.0})
        assert valid is False
        assert error is not None
        assert result is None

    @pytest.mark.asyncio
    async def test_evaluate_formula_missing_metric(self, mock_redis):
        service = FormulaService()
        valid, error, result = await service.evaluate_formula("nonexistent", {"roe": 10.0})
        assert valid is False
        assert error is not None
        assert result is None


class TestFormulaServiceSave:
    @pytest.mark.asyncio
    async def test_save_formula(self, mock_redis):
        service = FormulaService()
        with patch.object(
            RedisManager, "atomic_update_json", side_effect=lambda key, func, ttl=None: func([])
        ):
            valid, error, formula = await service.save_formula(
                name="Test Formula", formula="roe + roi", description="A test formula"
            )
        assert valid is True
        assert error is None
        assert formula is not None
        assert formula.name == "Test Formula"
        assert formula.formula == "roe + roi"
        assert formula.description == "A test formula"

    @pytest.mark.asyncio
    async def test_save_formula_invalid(self, mock_redis):
        service = FormulaService()
        valid, error, formula = await service.save_formula(
            name="Invalid",
            formula="roe +",
        )
        assert valid is False
        assert error is not None
        assert formula is None


class TestFormulaServiceGet:
    @pytest.mark.asyncio
    async def test_get_formulas_empty(self, mock_redis):
        service = FormulaService()
        with patch.object(RedisManager, "get_json", return_value=None):
            formulas = await service.get_formulas()
            assert formulas == []

    @pytest.mark.asyncio
    async def test_get_formula(self, mock_redis):
        service = FormulaService()
        formula_id = "test-id-123"
        with patch.object(
            RedisManager,
            "get_json",
            return_value=[
                {
                    "id": formula_id,
                    "name": "Test",
                    "formula": "roe + roi",
                    "created_at": "2024-01-01T00:00:00",
                }
            ],
        ):
            formula = await service.get_formula(formula_id)
            assert formula is not None
            assert formula.id == formula_id
            assert formula.name == "Test"


class TestFormulaServiceDelete:
    @pytest.mark.asyncio
    async def test_delete_formula_success(self, mock_redis):
        service = FormulaService()
        formula_id = "test-id-123"
        original_list = [{"id": formula_id, "name": "Test", "formula": "roe"}]
        with patch.object(
            RedisManager,
            "atomic_update_json",
            side_effect=lambda key, func, ttl=None: func(original_list.copy()),
        ):
            result = await service.delete_formula(formula_id)
            assert result is True

    @pytest.mark.asyncio
    async def test_delete_formula_not_found(self, mock_redis):
        service = FormulaService()
        with patch.object(
            RedisManager,
            "atomic_update_json",
            side_effect=lambda key, func, ttl=None: func([]),
        ):
            result = await service.delete_formula("nonexistent-id")
            assert result is False


class TestFormulaClass:
    def test_formula_validate_valid(self):
        formula = Formula(id="test-id", name="Test", formula="roe + roi")
        valid, error = formula.validate()
        assert valid is True
        assert error is None

    def test_formula_validate_invalid(self):
        formula = Formula(id="test-id", name="Test", formula="roe +")
        valid, error = formula.validate()
        assert valid is False
        assert error is not None

    def test_formula_to_dict(self):
        formula = Formula(
            id="test-id", name="Test", formula="roe + roi", description="Test description"
        )
        d = formula.to_dict()
        assert d["id"] == "test-id"
        assert d["name"] == "Test"
        assert d["formula"] == "roe + roi"
        assert d["description"] == "Test description"

    def test_formula_from_dict(self):
        data = {
            "id": "test-id",
            "name": "Test",
            "formula": "roe + roi",
            "description": "Test description",
            "created_at": "2024-01-01T00:00:00",
        }
        formula = Formula.from_dict(data)
        assert formula.id == "test-id"
        assert formula.name == "Test"
        assert formula.formula == "roe + roi"

    def test_formula_ast_property(self):
        formula = Formula(id="test-id", name="Test", formula="roe + roi")
        ast = formula.ast
        assert ast is not None

    def test_formula_ast_invalid_raises(self):
        formula = Formula(id="test-id", name="Test", formula="roe +")
        with pytest.raises(Exception):
            _ = formula.ast
