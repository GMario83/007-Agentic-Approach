# DAX Naming Conventions

## Golden Rules

- All names should be clear for business users and understandable in reports.
- Avoid abbreviations or acronyms unless widely recognized by the business.

---

## Tables

- Do not use any technical prefix like `dim` or `fact`.
- Use a single noun when possible.
- Separate multi-word names with spaces if the table is visible to users (e.g., `Coupons Orders`).
- Use PascalCase (e.g., `PricingConfiguration`) if the table is hidden from users.
- Use singular nouns for qualitative entities (e.g., `Customer`, `Product`, `Sales Region`).
- Use uncountable or plural nouns for quantitative entities (e.g., `Sales`, `Inventory`, `Revenue`, `Movements`).

## Columns

- Do not use any technical prefix like `date` or `string`.
- Use a single noun when possible.
- Separate multi-word names with spaces if visible to users.
- Use PascalCase if the column is hidden from users.

## Measures

- The measure name should clearly describe its result.
- Separate multi-word names with spaces if visible (e.g., `Sales Amount`).
- Use PascalCase if the measure is hidden (e.g., `SalesAmount`).
- Consider common acronyms recognized by the business (e.g., `ROI`, `YOY`).
- Use time intelligence acronyms as a **suffix** (e.g., `Sales Amount YTD`, `Sales Amount PY`).

### Time Intelligence Acronym Table

| Acronym | Meaning |
|---|---|
| YTD | Year-to-date |
| QTD | Quarter-to-date |
| MTD | Month-to-date |
| MAT | Moving annual total |
| PY | Previous year |
| PQ | Previous quarter |
| PM | Previous month |
| PYC | Previous year complete |
| PQC | Previous quarter complete |
| PMC | Previous month complete |
| PP | Previous period (auto-selects year, quarter, or month) |
| PYMAT | Previous year moving annual total |
| YOY | Year-over-year |
| QOQ | Quarter-over-quarter |
| MOM | Month-over-month |
| MATG | Moving annual total growth |
| POP | Period-over-period (auto-selects year, quarter, or month) |
| PYTD | Previous year-to-date |
| PQTD | Previous quarter-to-date |
| PMTD | Previous month-to-date |
| YOYTD | Year-over-year-to-date |
| QOQTD | Quarter-over-quarter-to-date |
| MOMTD | Month-over-month-to-date |
| YTDOPY | Year-to-date-over-previous-year |
| QTDOPQ | Quarter-to-date-over-previous-quarter |
| MTDOPM | Month-to-date-over-previous-month |

---

## Variables

- Use PascalCase (e.g., `TotalRevenue`, `FilteredSales`).
- Define a last variable named `Result` to hold the final return value — makes debugging easier.
- Optional `_` (underscore) prefix to visually distinguish variables from other objects.

## User-Defined Functions

### Function Names

- Use PascalCase.
- Use the dot character (`.`) for namespace-style categorization.
- **Model-dependent functions** should use a `Local.` prefix to avoid conflicts with future DAX function names.
  - `GetCustomerDiscount` — acceptable if model-dependent is obvious.
  - `Local.GetCustomerDiscount` — explicit model-dependent marker.
  - `Local.Checkout.GetCustomerDiscount` — subcategory grouping.
  - Do NOT use `Checkout.GetCustomerDiscount` (looks model-independent).
- **Model-independent functions** must begin with a library prefix.
  - `Math.SumTwoNumbers` — library name prefix.
  - `CompanyName.Math.SumTwoNumbers` — company + library prefix.
  - Do NOT use `SumTwoNumbers` alone (looks model-dependent).
- Do NOT use `Dax` in function names (reserved by Microsoft).
- Do NOT use `DaxLib` as an initial prefix (reserved by DAX Lib community).

### Parameters

- Use camelCase for parameter names.
- Include a type suffix for EXPR parameters:

| Suffix | Type | Example |
|---|---|---|
| `Column` | COLUMNREF | `listPriceColumn` |
| `Table` | TABLEREF | `lookupTable` |
| `Measure` | MEASUREREF | `amountMeasure` |
| `Expr` | ANYREF | `metricExpr` |
| `Calendar` | CALENDARREF | `fiscalCalendar` |

> `YearlySales` = variable (PascalCase). `yearlySales` = parameter (camelCase).

### Comments (JSDoc-style)

Use `///` triple-slash comments before function declarations:

```dax
/// Convert from Celsius(°C) to Fahrenheit(°F)
/// @param {decimal} temperature – The temperature in Celsius
/// @returns The temperature converted to Fahrenheit
FUNCTION CelsiusToFahrenheit = ( temperature: DOUBLE ) =>
    ( temperature * ( 9 / 5 ) ) + 32
```

Rules:
- `///` starts a comment block for a function.
- `@param` describes each parameter (`@arg` and `@argument` also accepted).
- Optional: type in curly braces `{}` after `@param`.
- Optional: en dash `–` separates parameter name from description.
- `@returns` (or `@return`) describes the return value.
