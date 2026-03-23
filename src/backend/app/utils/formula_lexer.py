from enum import Enum
from dataclasses import dataclass
from typing import Optional


class TokenType(Enum):
    NUMBER = "NUMBER"
    IDENTIFIER = "IDENTIFIER"
    OPERATOR = "OPERATOR"
    LPAREN = "LPAREN"
    RPAREN = "RPAREN"
    LBRACKET = "LBRACKET"
    RBRACKET = "RBRACKET"
    COMMA = "COMMA"
    FUNCTION = "FUNCTION"
    EOF = "EOF"


class FormulaLexerError(Exception):
    def __init__(self, message: str, position: int):
        self.message = message
        self.position = position
        super().__init__(f"Lexer error at position {position}: {message}")


@dataclass
class Token:
    type: TokenType
    value: str
    position: int


class FormulaLexer:
    OPERATORS = {"+", "-", "*", "/"}
    FUNCTIONS = {"AVG", "SUM", "MIN", "MAX", "STD"}
    
    def __init__(self, text: str):
        self.text = text
        self.pos = 0
        self.current_char = self.text[0] if self.text else None
    
    def advance(self) -> None:
        self.pos += 1
        if self.pos < len(self.text):
            self.current_char = self.text[self.pos]
        else:
            self.current_char = None
    
    def skip_whitespace(self) -> None:
        while self.current_char is not None and self.current_char.isspace():
            self.advance()
    
    def read_number(self) -> str:
        result = ""
        start_pos = self.pos
        while self.current_char is not None and (
            self.current_char.isdigit() or self.current_char == "."
        ):
            result += self.current_char
            self.advance()
        return result
    
    def read_identifier(self) -> str:
        result = ""
        start_pos = self.pos
        while self.current_char is not None and (
            self.current_char.isalnum() or self.current_char in ("_", ":")
        ):
            result += self.current_char
            self.advance()
        return result
    
    def peek(self) -> Optional[str]:
        peek_pos = self.pos + 1
        if peek_pos < len(self.text):
            return self.text[peek_pos]
        return None
    
    def get_next_token(self) -> Token:
        while self.current_char is not None:
            start_pos = self.pos
            
            if self.current_char.isspace():
                self.skip_whitespace()
                continue
            
            if self.current_char.isdigit():
                value = self.read_number()
                return Token(TokenType.NUMBER, value, start_pos)
            
            if self.current_char.isalpha() or self.current_char == "_":
                identifier = self.read_identifier()
                if identifier.upper() in self.FUNCTIONS:
                    return Token(TokenType.FUNCTION, identifier.upper(), start_pos)
                return Token(TokenType.IDENTIFIER, identifier, start_pos)
            
            if self.current_char == "+":
                self.advance()
                return Token(TokenType.OPERATOR, "+", start_pos)
            
            if self.current_char == "-":
                self.advance()
                return Token(TokenType.OPERATOR, "-", start_pos)
            
            if self.current_char == "*":
                self.advance()
                return Token(TokenType.OPERATOR, "*", start_pos)
            
            if self.current_char == "/":
                self.advance()
                return Token(TokenType.OPERATOR, "/", start_pos)
            
            if self.current_char == "(":
                self.advance()
                return Token(TokenType.LPAREN, "(", start_pos)
            
            if self.current_char == ")":
                self.advance()
                return Token(TokenType.RPAREN, ")", start_pos)
            
            if self.current_char == "[":
                self.advance()
                return Token(TokenType.LBRACKET, "[", start_pos)
            
            if self.current_char == "]":
                self.advance()
                return Token(TokenType.RBRACKET, "]", start_pos)
            
            if self.current_char == ",":
                self.advance()
                return Token(TokenType.COMMA, ",", start_pos)
            
            raise FormulaLexerError(f"Unexpected character: '{self.current_char}'", start_pos)
        
        return Token(TokenType.EOF, "", self.pos)
    
    def tokenize(self) -> list[Token]:
        tokens = []
        while True:
            token = self.get_next_token()
            tokens.append(token)
            if token.type == TokenType.EOF:
                break
        return tokens


def tokenize(formula: str) -> list[Token]:
    lexer = FormulaLexer(formula)
    return lexer.tokenize()
