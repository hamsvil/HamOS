 
import { 
  Expr, ExprVisitor, Binary, Grouping, Literal, Unary, Variable, Assign, Call,
  Stmt, StmtVisitor, Expression, Print, Var, Block, If, While, FunctionStmt, Return 
} from './Parser';
import { TokenType } from './Dictionary';

export class Transpiler implements ExprVisitor<string>, StmtVisitor<string> {
  private indentLevel = 0;

  transpile(statements: Stmt[]): string {
    let result = "";
    for (const statement of statements) {
      result += statement.accept(this) + "\n";
    }
    return result;
  }

  private indent(): string {
    return "  ".repeat(this.indentLevel);
  }

  // Expression Visitor
  visitAssignExpr(expr: Assign): string {
    return `${expr.name.lexeme} = ${expr.value.accept(this)}`;
  }

  visitBinaryExpr(expr: Binary): string {
    let operator = expr.operator.lexeme;
    // Map ham-script operators to JS if needed (though they are mostly same)
    if (expr.operator.type === TokenType.AND) operator = "&&";
    if (expr.operator.type === TokenType.OR) operator = "||";
    if (expr.operator.type === TokenType.EQUAL_EQUAL) operator = "===";
    if (expr.operator.type === TokenType.BANG_EQUAL) operator = "!==";

    return `(${expr.left.accept(this)} ${operator} ${expr.right.accept(this)})`;
  }

  visitCallExpr(expr: Call): string {
    const args = expr.args.map(arg => arg.accept(this)).join(", ");
    return `${expr.callee.accept(this)}(${args})`;
  }

  visitGroupingExpr(expr: Grouping): string {
    return `(${expr.expression.accept(this)})`;
  }

  visitLiteralExpr(expr: Literal): string {
    if (expr.value === null) return "null";
    if (typeof expr.value === "string") return `"${expr.value}"`;
    return String(expr.value);
  }

  visitUnaryExpr(expr: Unary): string {
    const operator = expr.operator.lexeme;
    return `${operator}${expr.right.accept(this)}`;
  }

  visitVariableExpr(expr: Variable): string {
    return expr.name.lexeme;
  }

  // Statement Visitor
  visitBlockStmt(stmt: Block): string {
    let result = "{\n";
    this.indentLevel++;
    for (const s of stmt.statements) {
      result += this.indent() + s.accept(this) + "\n";
    }
    this.indentLevel--;
    result += this.indent() + "}";
    return result;
  }

  visitExpressionStmt(stmt: Expression): string {
    return `${stmt.expression.accept(this)};`;
  }

  visitFunctionStmt(stmt: FunctionStmt): string {
    const params = stmt.params.map(p => p.lexeme).join(", ");
    let result = `function ${stmt.name.lexeme}(${params}) {\n`;
    this.indentLevel++;
    for (const s of stmt.body) {
      result += this.indent() + s.accept(this) + "\n";
    }
    this.indentLevel--;
    result += this.indent() + "}";
    return result;
  }

  visitIfStmt(stmt: If): string {
    let result = `if (${stmt.condition.accept(this)}) ${stmt.thenBranch.accept(this)}`;
    if (stmt.elseBranch) {
      result += ` else ${stmt.elseBranch.accept(this)}`;
    }
    return result;
  }

  visitPrintStmt(stmt: Print): string {
    return `console.log(${stmt.expression.accept(this)});`;
  }

  visitReturnStmt(stmt: Return): string {
    if (stmt.value) {
      return `return ${stmt.value.accept(this)};`;
    }
    return "return;";
  }

  visitVarStmt(stmt: Var): string {
    let result = `let ${stmt.name.lexeme}`;
    if (stmt.initializer) {
      result += ` = ${stmt.initializer.accept(this)}`;
    }
    return result + ";";
  }

  visitWhileStmt(stmt: While): string {
    return `while (${stmt.condition.accept(this)}) ${stmt.body.accept(this)}`;
  }
}
