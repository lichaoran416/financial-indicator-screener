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

    def test_division_by_zero_in_list_evaluation(self):
        metric_values = {
            "roe": [10.0, 11.0, 12.0],
            "divisor": [1.0, 0.0, 2.0],
        }
        ast = parse("roe / divisor")
        with pytest.raises(FormulaEvaluatorError, match="Division by zero in list evaluation"):
            evaluate_time_series(ast, metric_values)


class TestTimeSeriesParsing:
    def test_parse_time_series_single_year(self):
        ast = parse("ROE[2023]")
        assert ast.node_type.value == "TIME_SERIES"
        assert ast.metric_name == "ROE"
        assert ast.year == 2023

    def test_parse_time_series_year_range(self):
        ast = parse("ROE[2020:2024]")
        assert ast.node_type.value == "TIME_SERIES"
        assert ast.metric_name == "ROE"
        assert ast.year == (2020, 2024)

    def test_parse_time_series_with_expression(self):
        ast = parse("AVG(ROE[2020:2024])")
        assert ast.node_type.value == "FUNCTION_CALL"
        assert ast.metric_name == "AVG"
        assert ast.args[0].node_type.value == "TIME_SERIES"
        assert ast.args[0].metric_name == "ROE"
        assert ast.args[0].year == (2020, 2024)


class TestTimeSeriesEvaluation:
    def test_evaluate_time_series_single_year_from_dict(self):
        evaluator = FormulaEvaluator()
        evaluator.set_metrics_data({"ROE": {2023: 15.5, 2022: 14.0, 2021: 13.0}})
        ast = parse("ROE[2023]")
        result = evaluator.evaluate(ast)
        assert result == 15.5

    def test_evaluate_time_series_year_range_from_dict(self):
        evaluator = FormulaEvaluator()
        evaluator.set_metrics_data(
            {"ROE": {2020: 10.0, 2021: 11.0, 2022: 12.0, 2023: 13.0, 2024: 14.0}}
        )
        ast = parse("ROE[2020:2024]")
        result = evaluator.evaluate(ast)
        assert result == [10.0, 11.0, 12.0, 13.0, 14.0]


class TestMultipleFunctionArguments:
    def test_evaluate_multiple_args_avg(self):
        metrics_data = {
            "roe": 10.0,
            "roi": 5.0,
        }
        ast = parse("AVG(roe, roi)")
        result = evaluate(ast, metrics_data)
        assert result == 7.5

    def test_evaluate_multiple_args_sum(self):
        metrics_data = {
            "roe": 10.0,
            "roi": 5.0,
        }
        ast = parse("SUM(roe, roi)")
        result = evaluate(ast, metrics_data)
        assert result == 15.0

    def test_evaluate_multiple_args_min(self):
        metrics_data = {
            "roe": 10.0,
            "roi": 5.0,
            "gross_margin": 30.0,
        }
        ast = parse("MIN(roe, roi, gross_margin)")
        result = evaluate(ast, metrics_data)
        assert result == 5.0

    def test_evaluate_multiple_args_max(self):
        metrics_data = {
            "roe": 10.0,
            "roi": 5.0,
            "gross_margin": 30.0,
        }
        ast = parse("MAX(roe, roi, gross_margin)")
        result = evaluate(ast, metrics_data)
        assert result == 30.0


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
