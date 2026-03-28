from typing import Callable, Optional, Union, cast

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

    def evaluate(self, node: ASTNode) -> Union[float, list[float]]:
        if node.node_type == ASTNodeType.NUMBER:
            return float(node.value)

        if node.node_type == ASTNodeType.METRIC_REF:
            return self.get_metric_value(cast(str, node.metric_name))

        if node.node_type == ASTNodeType.TIME_SERIES:
            year = node.year
            if year is None:
                raise FormulaEvaluatorError("TIME_SERIES node has null year")
            return cast(float, self.get_time_series_value(cast(str, node.metric_name), year))

        if node.node_type == ASTNodeType.UNARY_OP:
            operand = self.evaluate(cast(ASTNode, node.right))
            if not isinstance(operand, (int, float)):
                raise FormulaEvaluatorError(
                    f"Unary operator '-' requires numeric operand, got {type(operand)}"
                )
            if node.operator == "-":
                return -operand
            return operand

        if node.node_type == ASTNodeType.BINARY_OP:
            left_val = self.evaluate(cast(ASTNode, node.left))
            right_val = self.evaluate(cast(ASTNode, node.right))

            if isinstance(left_val, list) and isinstance(right_val, list):
                max_len = max(len(left_val), len(right_val), 1)
                left_padded = left_val + [0.0] * (max_len - len(left_val))
                right_padded = right_val + [0.0] * (max_len - len(right_val))
                if node.operator == "+":
                    return [lv + rv for lv, rv in zip(left_padded, right_padded)]
                elif node.operator == "-":
                    return [lv - rv for lv, rv in zip(left_padded, right_padded)]
                elif node.operator == "*":
                    return [lv * rv for lv, rv in zip(left_padded, right_padded)]
                elif node.operator == "/":
                    return [
                        lv / rv if rv != 0 else 0.0 for lv, rv in zip(left_padded, right_padded)
                    ]
            elif isinstance(left_val, list):
                if not isinstance(right_val, (int, float)):
                    raise FormulaEvaluatorError(
                        f"Binary operator '{node.operator}' requires numeric operand, got {type(right_val)}"
                    )
                scalar = float(right_val)
                if node.operator == "+":
                    return [v + scalar for v in left_val]
                elif node.operator == "-":
                    return [v - scalar for v in left_val]
                elif node.operator == "*":
                    return [v * scalar for v in left_val]
                elif node.operator == "/":
                    return [v / scalar if scalar != 0 else 0.0 for v in left_val]
            elif isinstance(right_val, list):
                if not isinstance(left_val, (int, float)):
                    raise FormulaEvaluatorError(
                        f"Binary operator '{node.operator}' requires numeric operand, got {type(left_val)}"
                    )
                scalar = float(left_val)
                if node.operator == "+":
                    return [scalar + v for v in right_val]
                elif node.operator == "-":
                    return [scalar - v for v in right_val]
                elif node.operator == "*":
                    return [scalar * v for v in right_val]
                elif node.operator == "/":
                    return [scalar / v if v != 0 else 0.0 for v in right_val]
            else:
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
            return self.evaluate_function(cast(str, node.metric_name), node.args)

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

    def get_time_series_value(
        self, metric_name: str, year: Union[int, tuple[int, int]]
    ) -> Union[float, list[float]]:
        if metric_name not in self.metrics_data:
            raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")

        value = self.metrics_data[metric_name]

        if isinstance(value, dict):
            year_dict: dict[str | int, float] = cast(dict[str | int, float], value)
            if isinstance(year, tuple):
                start_year, end_year = year
                values = []
                for y in range(start_year, end_year + 1):
                    if y in year_dict and year_dict[y] is not None:
                        values.append(float(year_dict[y]))
                    elif str(y) in year_dict and year_dict[str(y)] is not None:
                        values.append(float(year_dict[str(y)]))
                if not values:
                    raise FormulaEvaluatorError(
                        f"No data for {metric_name}[{start_year}:{end_year}]"
                    )
                return values
            else:
                if year in year_dict and year_dict[year] is not None:
                    return float(year_dict[year])
                elif str(year) in year_dict and year_dict[str(year)] is not None:
                    return float(year_dict[str(year)])
                raise FormulaEvaluatorError(f"No data for {metric_name}[{year}]")

        if isinstance(value, list):
            if len(value) == 0:
                raise FormulaEvaluatorError(f"Empty list for metric: {metric_name}")
            if isinstance(year, tuple):
                start_year, end_year = year
                if start_year < 0 or start_year >= len(value):
                    raise FormulaEvaluatorError(
                        f"Start year {start_year} is out of bounds for metric {metric_name} "
                        f"which has {len(value)} data points"
                    )
                if end_year < 0 or end_year >= len(value):
                    raise FormulaEvaluatorError(
                        f"End year {end_year} is out of bounds for metric {metric_name} "
                        f"which has {len(value)} data points"
                    )
                if start_year > end_year:
                    raise FormulaEvaluatorError(f"Invalid year range: {start_year}:{end_year}")
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
            if isinstance(val, list):
                values.extend(val)
            else:
                values.append(val)

        return self.AGGREGATE_FUNCTIONS[func_name](values)

    def evaluate_list(self, node: ASTNode, metric_values: dict[str, list[float]]) -> list[float]:
        if node.node_type == ASTNodeType.METRIC_REF:
            metric_name = cast(str, node.metric_name)
            if metric_name not in metric_values:
                raise FormulaEvaluatorError(f"Unknown metric: {metric_name}")
            return metric_values[metric_name]

        if node.node_type == ASTNodeType.TIME_SERIES:
            metric_name = cast(str, node.metric_name)
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
            metric_name = cast(str, node.metric_name)
            args = node.args

            if args is None:
                raise FormulaEvaluatorError(
                    f"Function {metric_name} requires arguments but got None"
                )

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
                std_values: list[float] = []
                for arg in args:
                    std_values.extend(self.evaluate_list(arg, metric_values))
                if len(std_values) <= 1:
                    return [0.0]
                mean = sum(std_values) / len(std_values)
                variance = sum((x - mean) ** 2 for x in std_values) / len(std_values)
                return [variance**0.5]

        if node.node_type in (ASTNodeType.BINARY_OP, ASTNodeType.UNARY_OP):
            left_values: list[float] = []
            right_values: list[float] = []

            if node.left:
                left_values = self.evaluate_list(cast(ASTNode, node.left), metric_values)
            if node.right:
                right_values = self.evaluate_list(cast(ASTNode, node.right), metric_values)

            results = []
            max_len = max(
                len(left_values) if left_values else 0, len(right_values) if right_values else 0, 1
            )

            for i in range(max_len):
                left_val = left_values[i] if left_values and i < len(left_values) else 0.0
                right_val = right_values[i] if right_values and i < len(right_values) else 0.0

                if node.node_type == ASTNodeType.BINARY_OP:
                    if node.operator == "+":
                        results.append(left_val + right_val)
                    elif node.operator == "-":
                        results.append(left_val - right_val)
                    elif node.operator == "*":
                        results.append(left_val * right_val)
                    elif node.operator == "/":
                        if right_val == 0:
                            raise FormulaEvaluatorError(
                                f"Division by zero in list evaluation: {left_val} / {right_val}"
                            )
                        results.append(left_val / right_val)
                elif node.node_type == ASTNodeType.UNARY_OP:
                    if node.operator == "-":
                        results.append(-right_val)
                    else:
                        results.append(right_val)

            return results

        raise FormulaEvaluatorError(f"Cannot evaluate list for node type: {node.node_type}")


def evaluate(ast: ASTNode, metrics_data: Optional[MetricData] = None) -> float:
    evaluator = FormulaEvaluator(metrics_data)
    result = evaluator.evaluate(ast)
    if isinstance(result, list):
        raise FormulaEvaluatorError(
            f"evaluate() expected scalar result, got list of length {len(result)}"
        )
    return result


def evaluate_time_series(ast: ASTNode, metric_values: dict[str, list[float]]) -> list[float]:
    evaluator = FormulaEvaluator()
    return evaluator.evaluate_list(ast, metric_values)
