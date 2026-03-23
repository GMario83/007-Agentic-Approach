# DAX Code Formatting Rules

These rules follow the DAX Formatter standard for readability and maintainability.

---

## CALCULATE Syntax

- **Never** use shortened CALCULATE syntax.
- Write `CALCULATE( [measure], filter )` — not `[measure](filter)`.

## Spacing

- Always put a space before opening parenthesis `(` and after closing `)`.
- Always put a space before any operand and operator in an expression.
- Never put a space between table name and column name: `Sales[Amount]` not `Sales [Amount]`.

## Line Breaks

- If an expression must split across rows, the **operator goes first** on the new line.
- A function call in a multi-line expression must always be on a new row, preceded by an operator.

```dax
-- Correct: operator leads the new line
VAR Result =
    [Total Sales]
    + [Total Tax]
    + [Total Shipping]
```

## Table & Measure References

- **Only** use single quotes for table names when required (spaces or special characters).
  - `ThisTable` not `'ThisTable'`
  - `'This Table'` (required — has space)
  - `'ThisTable42'` (required — ends with digit)
- **Never** use table names for measure references: `[Total Sales]` not `Sales[Total Sales]`.
- **Always** use table names for column references: `Sales[Amount]` not `[Amount]`.

## Function Formatting

- Put a space before an argument if it is on the same line.
- Write a function **inline only** if it has a single argument that is not a function call.
- Put arguments on **new lines** if the function has 2+ arguments.

### Multi-line Function Layout

```dax
-- Opening parenthesis on the function line
-- Arguments indented 4 spaces from function start
-- Closing parenthesis aligned with function name start
-- Comma on same line as previous argument (no space before comma)
CALCULATE(
    [Total Sales],
    REMOVEFILTERS( Product[Category] )
)
```

## Short vs Long Format

| Format | Rule | Use case |
|---|---|---|
| **Short** | Strictly one argument per line | Educational content, documentation |
| **Long** | Multiple arguments allowed on same line | Real-world production code |
