import pytest
from app.utils.formula_evaluator import (
    FormulaEvaluator,
    FormulaEvaluatorError,
    evaluate,
    evaluate_time_series,
)
from app.utils.formula_parser import parse


class TestFormulaEvaluator:
    def test_evaluate_number(self):
        ast = parse("42")
        result = evaluate(ast)
        assert result == 42.0

    def test_evaluate_simple_addition(self):
        ast = parse("2 + 3")
        result = evaluate(ast)
        assert result == 5.0

    def test_evaluate_simple_subtraction(self):
        ast = parse("10 - 4")
        result = evaluate(ast)
        assert result == 6.0

    def test_evaluate_simple_multiplication(self):
        ast = parse("3 * 4")
        result = evaluate(ast)
        assert result == 12.0

    def test_evaluate_simple_division(self):
        ast = parse("15 / 3")
        result = evaluate(ast)
        assert result == 5.0

    def test_evaluate_complex_expression(self):
        ast = parse("2 + 3 * 4")
        result = evaluate(ast)
        assert result == 14.0

    def test_evaluate_with_parentheses(self):
        ast = parse("(2 + 3) * 4")
        result = evaluate(ast)
        assert result == 20.0

    def test_evaluate_unary_minus(self):
        ast = parse("-5")
        result = evaluate(ast)
        assert result == -5.0

    def test_evaluate_metric_ref(self):
        metrics_data = {"roe": 15.5}
        ast = parse("roe")
        result = evaluate(ast, metrics_data)
        assert result == 15.5

    def test_evaluate_metric_not_found(self):
        metrics_data = {"roe": 15.5}
        ast = parse("roi")
        with pytest.raises(FormulaEvaluatorError, match="Unknown metric"):
            evaluate(ast, metrics_data)


class TestFormulaEvaluatorListFunctions:
    def test_evaluate_list_with_metric_values(self):
        metric_values = {"roe": [10.0, 11.0, 12.0, 13.0]}
        ast = parse("roe")
        result = evaluate_time_series(ast, metric_values)
        assert result == [10.0, 11.0, 12.0, 13.0]

    def test_evaluate_list_binary_op(self):
        metric_values = {
            "roe": [10.0, 11.0, 12.0],
            "roi": [5.0, 6.0, 7.0],
        }
        ast = parse("roe + roi")
        result = evaluate_time_series(ast, metric_values)
        assert result == [15.0, 17.0, 19.0]

    def test_evaluate_list_binary_op_different_lengths(self):
        metric_values = {
            "roe": [10.0, 11.0, 12.0],
            "roi": [5.0, 6.0],
        }
        ast = parse("roe + roi")
        result = evaluate_time_series(ast, metric_values)
        assert result == [15.0, 17.0, 12.0]

    def test_evaluate_list_function_avg(self):
        metric_values = {
            "roe": [10.0, 11.0, 12.0],
        }
        ast = parse("AVG(roe)")
        result = evaluate_time_series(ast, metric_values)
        assert result == [11.0]

    def test_evaluate_list_function_sum(self):
        metric_values = {
            "roe": [10.0, 11.0, 12.0],
        }
        ast = parse("SUM(roe)")
        result = evaluate_time_series(ast, metric_values)
        assert result == [33.0]


class TestFormulaEvaluatorAggregateFunctions:
    def test_aggregate_avg(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["AVG"]([1.0, 2.0, 3.0, 4.0])
        assert result == 2.5

    def test_aggregate_avg_empty(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["AVG"]([])
        assert result == 0.0

    def test_aggregate_sum(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["SUM"]([1.0, 2.0, 3.0])
        assert result == 6.0

    def test_aggregate_min(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["MIN"]([5.0, 2.0, 8.0, 1.0])
        assert result == 1.0

    def test_aggregate_max(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["MAX"]([5.0, 2.0, 8.0, 1.0])
        assert result == 8.0

    def test_aggregate_std(self):
        evaluator = FormulaEvaluator()
        result = evaluator.AGGREGATE_FUNCTIONS["STD"]([2.0, 4.0, 4.0, 4.0, 5.0, 5.0, 7.0, 9.0])
        assert result == 2.0


class TestFormulaEvaluatorDivisionByZero:
    def test_division_by_zero(self):
        ast = parse("10 / 0")
        with pytest.raises(FormulaEvaluatorError, match="Division by zero"):
            evaluate(ast)


class TestFormulaEvaluatorSetMetricsData:
    def test_set_metrics_data(self):
        evaluator = FormulaEvaluator()
        evaluator.set_metrics_data({"roe": 15.5})
        ast = parse("roe")
        result = evaluator.evaluate(ast)
        assert result == 15.5

    def test_set_metrics_data_updates_existing(self):
        evaluator = FormulaEvaluator({"roe": 10.0})
        evaluator.set_metrics_data({"roe": 20.0})
        ast = parse("roe")
        result = evaluator.evaluate(ast)
        assert result == 20.0

    def test_get_time_series_value_with_list(self):
        evaluator = FormulaEvaluator()
        evaluator.set_metrics_data({"roe": [10.0, 11.0, 12.0, 13.0]})
        result = evaluator.get_time_series_value("roe", 2020)
        assert result == 13.0
