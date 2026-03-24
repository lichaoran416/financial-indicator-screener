from typing import Any, Optional, Union
from dataclasses import dataclass
from enum import Enum

from app.utils.formula_lexer import Token, TokenType, tokenize, FormulaLexerError


class ASTNodeType(Enum):
    NUMBER = "NUMBER"
    BINARY_OP = "BINARY_OP"
    UNARY_OP = "UNARY_OP"
    FUNCTION_CALL = "FUNCTION_CALL"
    METRIC_REF = "METRIC_REF"
    TIME_SERIES = "TIME_SERIES"


@dataclass
class ASTNode:
    node_type: ASTNodeType
    value: Any = None
    operator: Optional[str] = None
    left: Optional["ASTNode"] = None
    right: Optional["ASTNode"] = None
    args: Optional[list["ASTNode"]] = None
    metric_name: Optional[str] = None
    year: Optional[Union[int, tuple[int, int]]] = None


class FormulaParserError(Exception):
    def __init__(self, message: str, position: int):
        self.message = message
        self.position = position
        super().__init__(f"Parser error at position {position}: {message}")


class FormulaParser:
    def __init__(self, tokens: list[Token]):
        self.tokens = tokens
        self.pos = 0
        self.current_token = self.tokens[0] if self.tokens else None

    def advance(self) -> None:
        self.pos += 1
        if self.pos < len(self.tokens):
            self.current_token = self.tokens[self.pos]
        else:
            self.current_token = None

    def peek(self, offset: int = 1) -> Optional[Token]:
        peek_pos = self.pos + offset
        if peek_pos < len(self.tokens):
            return self.tokens[peek_pos]
        return None

    def parse(self) -> ASTNode:
        if self.current_token is None or self.current_token.type == TokenType.EOF:
            raise FormulaParserError("Empty formula", 0)
        result = self.parse_expression()
        if self.current_token is not None and self.current_token.type != TokenType.EOF:
            raise FormulaParserError(
                f"Unexpected token: {self.current_token.value}", self.current_token.position
            )
        return result

    def parse_expression(self) -> ASTNode:
        return self.parse_addition()

    def parse_addition(self) -> ASTNode:
        left = self.parse_multiplication()

        while (
            self.current_token is not None
            and self.current_token.type == TokenType.OPERATOR
            and self.current_token.value in ("+", "-")
        ):
            operator = self.current_token.value
            self.advance()
            right = self.parse_multiplication()
            left = ASTNode(
                node_type=ASTNodeType.BINARY_OP, operator=operator, left=left, right=right
            )

        return left

    def parse_multiplication(self) -> ASTNode:
        left = self.parse_unary()

        while (
            self.current_token is not None
            and self.current_token.type == TokenType.OPERATOR
            and self.current_token.value in ("*", "/")
        ):
            operator = self.current_token.value
            self.advance()
            right = self.parse_unary()
            left = ASTNode(
                node_type=ASTNodeType.BINARY_OP, operator=operator, left=left, right=right
            )

        return left

    def parse_unary(self) -> ASTNode:
        if (
            self.current_token is not None
            and self.current_token.type == TokenType.OPERATOR
            and self.current_token.value in ("+", "-")
        ):
            operator = self.current_token.value
            self.advance()
            operand = self.parse_unary()
            return ASTNode(node_type=ASTNodeType.UNARY_OP, operator=operator, right=operand)
        return self.parse_primary()

    def parse_primary(self) -> ASTNode:
        if self.current_token is None:
            raise FormulaParserError("Unexpected end of formula", self.pos)

        token = self.current_token

        if token.type == TokenType.NUMBER:
            self.advance()
            return ASTNode(node_type=ASTNodeType.NUMBER, value=float(token.value))

        if token.type == TokenType.IDENTIFIER:
            self.advance()
            if self.current_token is not None and self.current_token.type == TokenType.LBRACKET:
                return self.parse_time_series(token.value)
            return ASTNode(node_type=ASTNodeType.METRIC_REF, metric_name=token.value)

        if token.type == TokenType.FUNCTION:
            self.advance()
            return self.parse_function_call(token.value)

        if token.type == TokenType.LPAREN:
            self.advance()
            expr = self.parse_expression()
            if self.current_token is None or self.current_token.type != TokenType.RPAREN:
                raise FormulaParserError("Missing closing parenthesis", self.pos)
            self.advance()
            return expr

        if token.type == TokenType.OPERATOR:
            raise FormulaParserError(f"Unexpected operator: {token.value}", token.position)

        raise FormulaParserError(f"Unexpected token: {token.value}", token.position)

    def parse_time_series(self, metric_name: str) -> ASTNode:
        self.advance()

        if self.current_token is None or self.current_token.type != TokenType.LBRACKET:
            raise FormulaParserError("Expected '[' after metric name", self.pos)

        self.advance()

        if self.current_token is None:
            raise FormulaParserError("Unexpected end of formula in time series", self.pos)

        year_or_range: Optional[Union[int, tuple[int, int]]] = None

        if self.current_token.type == TokenType.NUMBER:
            year_val = int(self.current_token.value)
            self.advance()

            if (
                self.current_token is not None
                and self.current_token.type == TokenType.IDENTIFIER
                and self.current_token.value == ":"
            ):
                self.advance()
                if self.current_token is None or self.current_token.type != TokenType.NUMBER:
                    raise FormulaParserError("Expected end year after ':' in time range", self.pos)
                end_year = int(self.current_token.value)
                year_or_range = (year_val, end_year)
                self.advance()
            else:
                year_or_range = year_val

        if self.current_token is None or self.current_token.type != TokenType.RBRACKET:
            raise FormulaParserError("Missing closing ']' in time series", self.pos)

        self.advance()

        return ASTNode(
            node_type=ASTNodeType.TIME_SERIES, metric_name=metric_name, year=year_or_range
        )

    def parse_function_call(self, func_name: str) -> ASTNode:
        if self.current_token is None or self.current_token.type != TokenType.LPAREN:
            raise FormulaParserError(f"Expected '(' after function name {func_name}", self.pos)

        self.advance()

        args = []

        if self.current_token is not None and self.current_token.type != TokenType.RPAREN:
            args.append(self.parse_expression())

            while self.current_token is not None and self.current_token.type == TokenType.COMMA:
                self.advance()
                args.append(self.parse_expression())

        if self.current_token is None or self.current_token.type != TokenType.RPAREN:
            raise FormulaParserError("Missing closing parenthesis after function args", self.pos)

        self.advance()

        return ASTNode(node_type=ASTNodeType.FUNCTION_CALL, metric_name=func_name, args=args)


def parse(formula: str) -> ASTNode:
    tokens = tokenize(formula)
    parser = FormulaParser(tokens)
    return parser.parse()


def validate(formula: str) -> tuple[bool, Optional[str]]:
    try:
        parse(formula)
        return True, None
    except (FormulaLexerError, FormulaParserError) as e:
        return False, str(e)
