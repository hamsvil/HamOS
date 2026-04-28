/* eslint-disable no-useless-assignment */
import { TokenType, Token } from './Dictionary';

export abstract class Expr {
  abstract accept<R>(visitor: ExprVisitor<R>): R;
}

export interface ExprVisitor<R> {
  visitBinaryExpr(expr: Binary): R;
  visitGroupingExpr(expr: Grouping): R;
  visitLiteralExpr(expr: Literal): R;
  visitUnaryExpr(expr: Unary): R;
  visitVariableExpr(expr: Variable): R;
  visitAssignExpr(expr: Assign): R;
  visitCallExpr(expr: Call): R;
}

export class Binary extends Expr {
  constructor(public left: Expr, public operator: Token, public right: Expr) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitBinaryExpr(this); }
}

export class Grouping extends Expr {
  constructor(public expression: Expr) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitGroupingExpr(this); }
}

export class Literal extends Expr {
  constructor(public value: any) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitLiteralExpr(this); }
}

export class Unary extends Expr {
  constructor(public operator: Token, public right: Expr) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitUnaryExpr(this); }
}

export class Variable extends Expr {
  constructor(public name: Token) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitVariableExpr(this); }
}

export class Assign extends Expr {
  constructor(public name: Token, public value: Expr) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitAssignExpr(this); }
}

export class Call extends Expr {
  constructor(public callee: Expr, public paren: Token, public args: Expr[]) { super(); }
  accept<R>(visitor: ExprVisitor<R>): R { return visitor.visitCallExpr(this); }
}

export abstract class Stmt {
  abstract accept<R>(visitor: StmtVisitor<R>): R;
}

export interface StmtVisitor<R> {
  visitExpressionStmt(stmt: Expression): R;
  visitPrintStmt(stmt: Print): R;
  visitVarStmt(stmt: Var): R;
  visitBlockStmt(stmt: Block): R;
  visitIfStmt(stmt: If): R;
  visitWhileStmt(stmt: While): R;
  visitFunctionStmt(stmt: FunctionStmt): R;
  visitReturnStmt(stmt: Return): R;
}

export class Expression extends Stmt {
  constructor(public expression: Expr) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitExpressionStmt(this); }
}

export class Print extends Stmt {
  constructor(public expression: Expr) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitPrintStmt(this); }
}

export class Var extends Stmt {
  constructor(public name: Token, public initializer: Expr | null) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitVarStmt(this); }
}

export class Block extends Stmt {
  constructor(public statements: Stmt[]) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitBlockStmt(this); }
}

export class If extends Stmt {
  constructor(public condition: Expr, public thenBranch: Stmt, public elseBranch: Stmt | null) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitIfStmt(this); }
}

export class While extends Stmt {
  constructor(public condition: Expr, public body: Stmt) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitWhileStmt(this); }
}

export class FunctionStmt extends Stmt {
  constructor(public name: Token, public params: Token[], public body: Stmt[]) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitFunctionStmt(this); }
}

export class Return extends Stmt {
  constructor(public keyword: Token, public value: Expr | null) { super(); }
  accept<R>(visitor: StmtVisitor<R>): R { return visitor.visitReturnStmt(this); }
}

export class Parser {
  private current = 0;

  constructor(private tokens: Token[]) {}

  parse(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.isAtEnd()) {
      statements.push(this.declaration());
    }
    return statements;
  }

  private declaration(): Stmt {
    try {
      if (this.match(TokenType.FUNC)) return this.function("function");
      if (this.match(TokenType.VAR)) return this.varDeclaration();
      return this.statement();
    } catch (error) {
      this.synchronize();
      return null as any;
    }
  }

  private function(kind: string): FunctionStmt {
    const name = this.consume(TokenType.IDENTIFIER, `Expect ${kind} name.`);
    this.consume(TokenType.LPAREN, `Expect '(' after ${kind} name.`);
    const parameters: Token[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        parameters.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name."));
      } while (this.match(TokenType.COMMA));
    }
    this.consume(TokenType.RPAREN, "Expect ')' after parameters.");
    this.consume(TokenType.LBRACE, `Expect '{' before ${kind} body.`);
    const body = this.block();
    return new FunctionStmt(name, parameters, body);
  }

  private varDeclaration(): Stmt {
    const name = this.consume(TokenType.IDENTIFIER, "Expect variable name.");
    let initializer: Expr | null = null;
    if (this.match(TokenType.EQUAL)) {
      initializer = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after variable declaration.");
    return new Var(name, initializer);
  }

  private statement(): Stmt {
    if (this.match(TokenType.FOR)) return this.forStatement();
    if (this.match(TokenType.IF)) return this.ifStatement();
    if (this.match(TokenType.PRINT)) return this.printStatement();
    if (this.match(TokenType.RETURN)) return this.returnStatement();
    if (this.match(TokenType.WHILE)) return this.whileStatement();
    if (this.match(TokenType.LBRACE)) return new Block(this.block());
    return this.expressionStatement();
  }

  private forStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expect '(' after 'for'.");
    let initializer: Stmt | null = null;
    if (this.match(TokenType.SEMICOLON)) {
      initializer = null;
    } else if (this.match(TokenType.VAR)) {
      initializer = this.varDeclaration();
    } else {
      initializer = this.expressionStatement();
    }

    let condition: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after loop condition.");

    let increment: Expr | null = null;
    if (!this.check(TokenType.RPAREN)) {
      increment = this.expression();
    }
    this.consume(TokenType.RPAREN, "Expect ')' after for clauses.");

    let body = this.statement();

    if (increment !== null) {
      body = new Block([body, new Expression(increment)]);
    }

    if (condition === null) condition = new Literal(true);
    body = new While(condition, body);

    if (initializer !== null) {
      body = new Block([initializer, body]);
    }

    return body;
  }

  private ifStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expect '(' after 'if'.");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expect ')' after if condition.");
    const thenBranch = this.statement();
    let elseBranch: Stmt | null = null;
    if (this.match(TokenType.ELSE)) {
      elseBranch = this.statement();
    }
    return new If(condition, thenBranch, elseBranch);
  }

  private printStatement(): Stmt {
    const value = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after value.");
    return new Print(value);
  }

  private returnStatement(): Stmt {
    const keyword = this.previous();
    let value: Expr | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      value = this.expression();
    }
    this.consume(TokenType.SEMICOLON, "Expect ';' after return value.");
    return new Return(keyword, value);
  }

  private whileStatement(): Stmt {
    this.consume(TokenType.LPAREN, "Expect '(' after 'while'.");
    const condition = this.expression();
    this.consume(TokenType.RPAREN, "Expect ')' after while condition.");
    const body = this.statement();
    return new While(condition, body);
  }

  private block(): Stmt[] {
    const statements: Stmt[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.declaration());
    }
    this.consume(TokenType.RBRACE, "Expect '}' after block.");
    return statements;
  }

  private expressionStatement(): Stmt {
    const expr = this.expression();
    this.consume(TokenType.SEMICOLON, "Expect ';' after expression.");
    return new Expression(expr);
  }

  private expression(): Expr {
    return this.assignment();
  }

  private assignment(): Expr {
    const expr = this.or();
    if (this.match(TokenType.EQUAL)) {
      const equals = this.previous();
      const value = this.assignment();
      if (expr instanceof Variable) {
        const name = expr.name;
        return new Assign(name, value);
      }
      throw new Error("Invalid assignment target.");
    }
    return expr;
  }

  private or(): Expr {
    let expr = this.and();
    while (this.match(TokenType.OR)) {
      const operator = this.previous();
      const right = this.and();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private and(): Expr {
    let expr = this.equality();
    while (this.match(TokenType.AND)) {
      const operator = this.previous();
      const right = this.equality();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private equality(): Expr {
    let expr = this.comparison();
    while (this.match(TokenType.BANG_EQUAL, TokenType.EQUAL_EQUAL)) {
      const operator = this.previous();
      const right = this.comparison();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private comparison(): Expr {
    let expr = this.term();
    while (this.match(TokenType.GREATER, TokenType.GREATER_EQUAL, TokenType.LESS, TokenType.LESS_EQUAL)) {
      const operator = this.previous();
      const right = this.term();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private term(): Expr {
    let expr = this.factor();
    while (this.match(TokenType.MINUS, TokenType.PLUS)) {
      const operator = this.previous();
      const right = this.factor();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private factor(): Expr {
    let expr = this.unary();
    while (this.match(TokenType.SLASH, TokenType.STAR)) {
      const operator = this.previous();
      const right = this.unary();
      expr = new Binary(expr, operator, right);
    }
    return expr;
  }

  private unary(): Expr {
    if (this.match(TokenType.BANG, TokenType.MINUS)) {
      const operator = this.previous();
      const right = this.unary();
      return new Unary(operator, right);
    }
    return this.call();
  }

  private call(): Expr {
    let expr = this.primary();
    while (true) {
      if (this.match(TokenType.LPAREN)) {
        expr = this.finishCall(expr);
      } else {
        break;
      }
    }
    return expr;
  }

  private finishCall(callee: Expr): Expr {
    const args: Expr[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do {
        args.push(this.expression());
      } while (this.match(TokenType.COMMA));
    }
    const paren = this.consume(TokenType.RPAREN, "Expect ')' after arguments.");
    return new Call(callee, paren, args);
  }

  private primary(): Expr {
    if (this.match(TokenType.FALSE)) return new Literal(false);
    if (this.match(TokenType.TRUE)) return new Literal(true);
    if (this.match(TokenType.NULL)) return new Literal(null);
    if (this.match(TokenType.NUMBER, TokenType.STRING)) return new Literal(this.previous().literal);
    if (this.match(TokenType.IDENTIFIER)) return new Variable(this.previous());
    if (this.match(TokenType.LPAREN)) {
      const expr = this.expression();
      this.consume(TokenType.RPAREN, "Expect ')' after expression.");
      return new Grouping(expr);
    }
    throw new Error("Expect expression.");
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(message);
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private synchronize(): void {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.previous().type === TokenType.SEMICOLON) return;
      switch (this.peek().type) {
        case TokenType.CLASS:
        case TokenType.FUNC:
        case TokenType.VAR:
        case TokenType.FOR:
        case TokenType.IF:
        case TokenType.WHILE:
        case TokenType.PRINT:
        case TokenType.RETURN:
          return;
      }
      this.advance();
    }
  }
}
