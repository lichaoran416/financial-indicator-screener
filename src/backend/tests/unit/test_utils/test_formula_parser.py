import pytest
from app.utils.formula_parser import (
    FormulaParserError,
    ASTNodeType,
    parse,
    validate,
)


class TestFormulaParserNumbers:
    def test_parse_integer(self):
        ast = parse("42")
        assert ast.node_type == ASTNodeType.NUMBER
        assert ast.value == 42.0

    def test_parse_float(self):
        ast = parse("3.14")
        assert ast.node_type == ASTNodeType.NUMBER
        assert ast.value == 3.14


class TestFormulaParserIdentifiers:
    def test_parse_simple_metric(self):
        ast = parse("roe")
        assert ast.node_type == ASTNodeType.METRIC_REF
        assert ast.metric_name == "roe"


class TestFormulaParserBinaryOps:
    def test_parse_addition(self):
        ast = parse("2 + 3")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "+"
        assert ast.left.node_type == ASTNodeType.NUMBER
        assert ast.right.node_type == ASTNodeType.NUMBER

    def test_parse_subtraction(self):
        ast = parse("5 - 2")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "-"

    def test_parse_multiplication(self):
        ast = parse("3 * 4")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "*"

    def test_parse_division(self):
        ast = parse("10 / 2")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "/"

    def test_parse_complex_expression(self):
        ast = parse("2 + 3 * 4")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "+"
        assert ast.left.node_type == ASTNodeType.NUMBER
        assert ast.right.node_type == ASTNodeType.BINARY_OP


class TestFormulaParserUnaryOp:
    def test_parse_unary_minus(self):
        ast = parse("-5")
        assert ast.node_type == ASTNodeType.UNARY_OP
        assert ast.operator == "-"

    def test_parse_unary_plus(self):
        ast = parse("+5")
        assert ast.node_type == ASTNodeType.UNARY_OP
        assert ast.operator == "+"


class TestFormulaParserParentheses:
    def test_parse_with_parentheses(self):
        ast = parse("(roe + roi)")
        assert ast.node_type == ASTNodeType.BINARY_OP

    def test_parse_priority_with_parentheses(self):
        ast = parse("(2 + 3) * 4")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "*"


class TestFormulaParserFunctions:
    def test_parse_function_no_args(self):
        ast = parse("AVG(roe)")
        assert ast.node_type == ASTNodeType.FUNCTION_CALL
        assert ast.metric_name == "AVG"

    def test_parse_function_with_args(self):
        ast = parse("AVG(roe)")
        assert ast.args is not None
        assert len(ast.args) == 1

    def test_parse_function_multiple_args(self):
        ast = parse("AVG(roe + roi)")
        assert ast.node_type == ASTNodeType.FUNCTION_CALL


class TestFormulaParserValidate:
    def test_validate_valid_formula(self):
        valid, error = validate("roe + roi")
        assert valid is True
        assert error is None

    def test_validate_invalid_formula(self):
        valid, error = validate("roe +")
        assert valid is False
        assert error is not None


class TestFormulaParserErrors:
    def test_parse_empty_formula(self):
        with pytest.raises(FormulaParserError, match="Empty formula"):
            parse("")

    def test_parse_unexpected_token(self):
        with pytest.raises(FormulaParserError, match="Unexpected token"):
            parse("roe +")

    def test_parse_missing_closing_paren(self):
        with pytest.raises(FormulaParserError, match="Missing closing parenthesis"):
            parse("(roe + roi")

    def test_parse_unexpected_operator(self):
        with pytest.raises(FormulaParserError, match="Unexpected operator"):
            parse("roe + * roi")


class TestFormulaParserComplexExpressions:
    def test_parse_nested_functions(self):
        ast = parse("AVG(roe + roi)")
        assert ast.node_type == ASTNodeType.FUNCTION_CALL
        assert ast.metric_name == "AVG"

    def test_parse_metric_in_function(self):
        ast = parse("AVG(roe)")
        assert ast.node_type == ASTNodeType.FUNCTION_CALL
        assert ast.args[0].node_type == ASTNodeType.METRIC_REF

    def test_parse_complex_nested(self):
        ast = parse("(roe + roi) * 2")
        assert ast.node_type == ASTNodeType.BINARY_OP
        assert ast.operator == "*"
