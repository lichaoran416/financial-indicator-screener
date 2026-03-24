from typing import Callable, Optional, Union

from app.utils.formula_parser import ASTNode, ASTNodeType


class FormulaEvaluatorError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(f"Evaluator error: {message}")


MetricData = dict[str, Union[float, list[float], dict[str, list[float]]]]


class FormulaEvaluator:
    AGGREGATE_FUNCTIONS: dict[str, Callable[[list[float]], float]] = {
        "AVG": lambda values: sum(values) / len(values) if values else 0.0,
        "SUM": lambda values: sum(values) if values else 0.0,
        "MIN": lambda values: min(values) if values else 0.0,
        "MAX": lambda values: max(values) if values else 0.0,
        "STD": lambda values: (
            (sum((x - sum(values) / len(values)) ** 2 for x in values) / len(values)) ** 0.5
            if len(values) > 1
            else 0.0
        ),
    }

    def __init__(self, metrics_data: Optional[MetricData] = None):
        self.metrics_data: MetricData = metrics_data or {}

    def set_metrics_data(self, metrics_data: MetricData) -> None:
        self.metrics_data = metrics_data

    def evaluate(self, node: ASTNode) -> float:
        if node.node_type == ASTNodeType.NUMBER:
            return float(node.value)

        if node.node_type == ASTNodeType.METRIC_REF:
            return self.get_metric_value(node.metric_name)

        if node.node_type == ASTNodeType.TIME_SERIES:
            return self.get_time_series_value(node.metric_name, node.year)

        if node.node_type == ASTNodeType.UNARY_OP:
            operand = self.evaluate(node.right)
            if node.operator == "-":
                return -operand
            return operand

        if node.node_type == ASTNodeType.BINARY_OP:
            left_val = self.evaluate(node.left)
            right_val = self.evaluate(node.right)

            if node.operator == "+":
                return left_val + right_val
            elif node.operator == "-":
                return left_val - right_val
            elif node.operator == "*":
                return left_val * right_val
            elif node.operator == "/":
                if right_val == 0:
                    raise FormulaEvaluatorError(f"Division by zero: {left_val} / {right_val}")
                return left_val / right_val

        if node.node_type == ASTNodeType.FUNCTION_CALL:
            return self.evaluate_function(node.metric_name, node.args)

        raise FormulaEvaluatorError(f"Unknown node type: {node.node_type}")

    def get_metric_value(self, metric_name: str) -> float:
        if metric_name not in self.metrics_data:
            raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")

        value = self.metrics_data[metric_name]

        if isinstance(value, (int, float)):
            return float(value)

        if isinstance(value, list):
            if not value:
                raise FormulaEvaluatorError(f"Empty list for metric: {metric_name}")
            valid_values = [v for v in value if v is not None and str(v) != "nan"]
            if not valid_values:
                raise FormulaEvaluatorError(f"No valid values for metric: {metric_name}")
            return float(valid_values[-1])

        raise FormulaEvaluatorError(f"Invalid metric value type for {metric_name}: {type(value)}")

    def get_time_series_value(self, metric_name: str, year: Union[int, tuple[int, int]]) -> float:
        if metric_name not in self.metrics_data:
            raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")

        value = self.metrics_data[metric_name]

        if isinstance(value, dict):
            if isinstance(year, tuple):
                start_year, end_year = year
                values = []
                for y in range(start_year, end_year + 1):
                    if y in value and value[y] is not None:
                        values.append(float(value[y]))
                if not values:
                    raise FormulaEvaluatorError(
                        f"No data for {metric_name}[{start_year}:{end_year}]"
                    )
                return values
            else:
                if year not in value or value[year] is None:
                    raise FormulaEvaluatorError(f"No data for {metric_name}[{year}]")
                return float(value[year])

        if isinstance(value, list):
            if len(value) == 0:
                raise FormulaEvaluatorError(f"Empty list for metric: {metric_name}")
            if isinstance(year, tuple):
                start_year, end_year = year
                return value[start_year : end_year + 1]
            return float(value[-1])

        raise FormulaEvaluatorError(f"Invalid time series value type for {metric_name}")

    def evaluate_function(self, func_name: str, args: Optional[list[ASTNode]]) -> float:
        if func_name not in self.AGGREGATE_FUNCTIONS:
            raise FormulaEvaluatorError(f"Unknown function: {func_name}")

        if not args:
            raise FormulaEvaluatorError(f"Function {func_name} requires arguments")

        values: list[float] = []
        for arg in args:
            val = self.evaluate(arg)
            values.append(val)

        return self.AGGREGATE_FUNCTIONS[func_name](values)

    def evaluate_list(self, node: ASTNode, metric_values: dict[str, list[float]]) -> list[float]:
        if node.node_type == ASTNodeType.METRIC_REF:
            metric_name = node.metric_name
            if metric_name not in metric_values:
                raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")
            return metric_values[metric_name]

        if node.node_type == ASTNodeType.TIME_SERIES:
            metric_name = node.metric_name
            year = node.year

            if metric_name not in metric_values:
                raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")

            values = metric_values[metric_name]

            if isinstance(year, tuple):
                start_year, end_year = year
                result = values[start_year : end_year + 1] if start_year < len(values) else []
            else:
                result = values

            return result

        if node.node_type == ASTNodeType.FUNCTION_CALL:
            metric_name = node.metric_name
            args = node.args

            if metric_name == "AVG":
                all_values: list[float] = []
                for arg in args:
                    all_values.extend(self.evaluate_list(arg, metric_values))
                return [sum(all_values) / len(all_values)] if all_values else [0.0]

            elif metric_name == "SUM":
                total = 0.0
                for arg in args:
                    total += sum(self.evaluate_list(arg, metric_values))
                return [total]

            elif metric_name == "MIN":
                min_val = float("inf")
                for arg in args:
                    vals = self.evaluate_list(arg, metric_values)
                    if vals:
                        min_val = min(min_val, min(vals))
                return [min_val if min_val != float("inf") else 0.0]

            elif metric_name == "MAX":
                max_val = float("-inf")
                for arg in args:
                    vals = self.evaluate_list(arg, metric_values)
                    if vals:
                        max_val = max(max_val, max(vals))
                return [max_val if max_val != float("-inf") else 0.0]

            elif metric_name == "STD":
                all_values: list[float] = []
                for arg in args:
                    all_values.extend(self.evaluate_list(arg, metric_values))
                if len(all_values) <= 1:
                    return [0.0]
                mean = sum(all_values) / len(all_values)
                variance = sum((x - mean) ** 2 for x in all_values) / len(all_values)
                return [variance**0.5]

        if node.node_type in (ASTNodeType.BINARY_OP, ASTNodeType.UNARY_OP):
            left_values: list[float] = []
            right_values: list[float] = []

            if node.left:
                left_values = self.evaluate_list(node.left, metric_values)
            if node.right:
                right_values = self.evaluate_list(node.right, metric_values)

            results = []
            max_len = max(
                len(left_values) if left_values else 0, len(right_values) if right_values else 0, 1
            )

            for i in range(max_len):
                l = left_values[i] if left_values and i < len(left_values) else 0.0
                r = right_values[i] if right_values and i < len(right_values) else 0.0

                if node.node_type == ASTNodeType.BINARY_OP:
                    if node.operator == "+":
                        results.append(l + r)
                    elif node.operator == "-":
                        results.append(l - r)
                    elif node.operator == "*":
                        results.append(l * r)
                    elif node.operator == "/":
                        if r == 0:
                            results.append(0.0)
                        else:
                            results.append(l / r)
                elif node.node_type == ASTNodeType.UNARY_OP:
                    if node.operator == "-":
                        results.append(-r)
                    else:
                        results.append(r)

            return results

        raise FormulaEvaluatorError(f"Cannot evaluate list for node type: {node.node_type}")


def evaluate(ast: ASTNode, metrics_data: Optional[MetricData] = None) -> float:
    evaluator = FormulaEvaluator(metrics_data)
    return evaluator.evaluate(ast)


def evaluate_time_series(ast: ASTNode, metric_values: dict[str, list[float]]) -> list[float]:
    evaluator = FormulaEvaluator()
    return evaluator.evaluate_list(ast, metric_values)
