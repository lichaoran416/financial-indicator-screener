import pytest
from app.utils.formula_lexer import (
    FormulaLexer,
    FormulaLexerError,
    TokenType,
    tokenize,
)


class TestFormulaLexerBasic:
    def test_tokenize_number(self):
        tokens = tokenize("42")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.NUMBER
        assert tokens[0].value == "42"
        assert tokens[1].type == TokenType.EOF

    def test_tokenize_float(self):
        tokens = tokenize("3.14")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.NUMBER
        assert tokens[0].value == "3.14"

    def test_tokenize_identifier(self):
        tokens = tokenize("roe")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[0].value == "roe"

    def test_tokenize_operator_plus(self):
        tokens = tokenize("+")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.OPERATOR
        assert tokens[0].value == "+"

    def test_tokenize_operator_minus(self):
        tokens = tokenize("-")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.OPERATOR
        assert tokens[0].value == "-"

    def test_tokenize_operator_multiply(self):
        tokens = tokenize("*")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.OPERATOR
        assert tokens[0].value == "*"

    def test_tokenize_operator_divide(self):
        tokens = tokenize("/")
        assert len(tokens) == 2
        assert tokens[0].type == TokenType.OPERATOR
        assert tokens[0].value == "/"


class TestFormulaLexerParentheses:
    def test_tokenize_left_paren(self):
        tokens = tokenize("(")
        assert tokens[0].type == TokenType.LPAREN

    def test_tokenize_right_paren(self):
        tokens = tokenize(")")
        assert tokens[0].type == TokenType.RPAREN

    def test_tokenize_expression(self):
        tokens = tokenize("(roe + roi)")
        assert tokens[0].type == TokenType.LPAREN
        assert tokens[1].type == TokenType.IDENTIFIER
        assert tokens[2].type == TokenType.OPERATOR
        assert tokens[3].type == TokenType.IDENTIFIER
        assert tokens[4].type == TokenType.RPAREN
        assert tokens[5].type == TokenType.EOF


class TestFormulaLexerBrackets:
    def test_tokenize_left_bracket(self):
        tokens = tokenize("[")
        assert tokens[0].type == TokenType.LBRACKET

    def test_tokenize_right_bracket(self):
        tokens = tokenize("]")
        assert tokens[0].type == TokenType.RBRACKET

    def test_tokenize_metric_with_bracket(self):
        tokens = tokenize("roe[]")
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[1].type == TokenType.LBRACKET
        assert tokens[2].type == TokenType.RBRACKET


class TestFormulaLexerFunctions:
    def test_tokenize_function_avg(self):
        tokens = tokenize("AVG(roe)")
        assert tokens[0].type == TokenType.FUNCTION
        assert tokens[0].value == "AVG"

    def test_tokenize_function_sum(self):
        tokens = tokenize("SUM(roe)")
        assert tokens[0].type == TokenType.FUNCTION
        assert tokens[0].value == "SUM"

    def test_tokenize_function_min(self):
        tokens = tokenize("MIN(roe)")
        assert tokens[0].type == TokenType.FUNCTION
        assert tokens[0].value == "MIN"

    def test_tokenize_function_max(self):
        tokens = tokenize("MAX(roe)")
        assert tokens[0].type == TokenType.FUNCTION
        assert tokens[0].value == "MAX"

    def test_tokenize_function_std(self):
        tokens = tokenize("STD(roe)")
        assert tokens[0].type == TokenType.FUNCTION
        assert tokens[0].value == "STD"


class TestFormulaLexerExpressions:
    def test_tokenize_simple_expression(self):
        tokens = tokenize("roe + roi")
        assert len(tokens) == 4
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[1].type == TokenType.OPERATOR
        assert tokens[2].type == TokenType.IDENTIFIER
        assert tokens[3].type == TokenType.EOF

    def test_tokenize_complex_expression(self):
        tokens = tokenize("roe + roi * 2")
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[1].type == TokenType.OPERATOR
        assert tokens[2].type == TokenType.IDENTIFIER
        assert tokens[3].type == TokenType.OPERATOR
        assert tokens[4].type == TokenType.NUMBER

    def test_tokenize_with_whitespace(self):
        tokens = tokenize("roe  +  roi")
        assert tokens[0].type == TokenType.IDENTIFIER
        assert tokens[1].type == TokenType.OPERATOR
        assert tokens[2].type == TokenType.IDENTIFIER


class TestFormulaLexerError:
    def test_unexpected_character(self):
        lexer = FormulaLexer("@")
        with pytest.raises(FormulaLexerError, match="Unexpected character"):
            lexer.get_next_token()


class TestFormulaLexerPosition:
    def test_token_position(self):
        tokens = tokenize("roe + roi")
        assert tokens[0].position == 0
        assert tokens[1].position == 4
        assert tokens[2].position == 6
