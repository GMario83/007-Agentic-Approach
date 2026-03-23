---
name: dax
description: >
  Use when writing, editing, optimizing, formatting, testing, or naming DAX measures,
  calculated columns, variables, or user-defined functions. Covers DAX code authoring
  best practices, EVALUATE testing patterns, DIVIDE safety, iterator optimization,
  filter context, SWITCH vs IF, naming conventions, time intelligence patterns,
  and DAX Formatter code style. Use alongside powerbi-modeling skill for model-level
  concerns (measure organization, display folders, format strings).
---

# DAX Authoring Skill
> Covers DAX code writing, formatting, optimization, and testing.
> For model-level design (storage modes, relationships, schema), see **powerbi-modeling**.

---

## § 1 — Naming Conventions

> Full rules: [naming-conventions.md](./references/naming-conventions.md)

| Object | Convention | Example |
|---|---|---|
| Tables | Space-separated if visible; PascalCase if hidden; no `dim`/`fact` prefix | `Customer`, `Coupons Orders` |
| Columns | Space-separated if visible; PascalCase if hidden; no type prefix | `Order Date`, `SortKey` |
| Measures | Space-separated, Title Case; time intel acronym as suffix | `Sales Amount YTD`, `Revenue PY` |
| Variables | PascalCase; last var named `Result` | `TotalRevenue`, `Result` |
| UDFs | PascalCase with dot namespacing; `Local.` prefix for model-dependent | `Local.GetDiscount` |
| Parameters | camelCase with type suffix | `lookupTable`, `amountMeasure` |

### Time Intelligence Suffixes (common)

| Suffix | Meaning |
|---|---|
| YTD | Year-to-date |
| QTD / MTD | Quarter / Month-to-date |
| PY / PQ / PM | Previous year / quarter / month |
| YOY / QOQ / MOM | Year / Quarter / Month-over-year/quarter/month |
| MAT | Moving annual total |
| PYTD | Previous year-to-date |

> See full acronym table in [naming-conventions.md](./references/naming-conventions.md).

---

## § 2 — Formatting Rules

> Full rules: [formatting.md](./references/formatting.md)

**Key rules — apply to all DAX code you write:**

1. **Never** use shortened CALCULATE: write `CALCULATE( [measure], filter )`.
2. **Spaces** before `(` and `)`, around operators, before arguments on same line.
3. **No space** between table and column: `Sales[Amount]`.
4. **Operators lead** new lines when expressions split across rows.
5. **Inline functions** only with a single non-function argument.
6. **2+ arguments** → each on a new line, indented 4 spaces, closing `)` aligned with function name.
7. **Table references**: omit quotes unless table name has spaces/special chars.
8. **Measure references**: never qualify with table name (`[Total Sales]` not `_Measures[Total Sales]`).
9. **Column references**: always qualify with table name (`Sales[Amount]`).

---

## § 3 — Writing Measures (MCP Workflow)

When working with a connected Power BI model via MCP tools:

### Read Existing Measures

```
measure_operations → operation: List
```
Returns all measures with expressions, descriptions, format strings, and display folders.

### Write / Update a Measure

```
measure_operations → operation: CreateOrUpdate
  name: "Sales YTD"
  expression: "TOTALYTD( [Total Sales], 'Date'[Date] )"
  description: "Year-to-date total sales. Relies on marked Date table."
  displayFolder: "Time Intelligence\\YTD"
  formatString: "$#,0.00"
```

**Before writing any measure:**
1. Apply naming conventions (§ 1) — check name follows Title Case + suffix pattern.
2. Apply formatting rules (§ 2) — format the expression.
3. Include a description (see **powerbi-modeling** § 1.4 for templates).
4. Set the format string (see **powerbi-modeling** § 8.3 for the format table).
5. Set the display folder (see **powerbi-modeling** § 8.1 for the folder structure).
6. Test after creation (§ 5).

### Read Measure Expression

```
measure_operations → operation: Get, name: "Sales YTD"
```

---

## § 4 — Optimization Checklist

> Full rules with before/after examples: [best-practices.md](./references/best-practices.md)

| # | Rule | Why |
|---|---|---|
| 1 | Use **variables** to cache intermediate results | Avoids repeated evaluation; improves readability |
| 2 | Use **DIVIDE** over `/` operator | Handles division-by-zero safely |
| 3 | **Never nest iterators** (SUMX inside SUMX) | O(n²) complexity |
| 4 | **Filter on columns**, not tables | `FILTER(VALUES(Col), ...)` not `FILTER(Table, ...)` |
| 5 | Use **Boolean filter arguments** in CALCULATE | Avoid FILTER() unless you need measures, multi-column, or OR logic |
| 6 | Use **SWITCH** over nested IF | More readable, often faster |
| 7 | Use **COUNTROWS** over COUNT | More efficient, self-describing |
| 8 | Use **RELATED** over LOOKUPVALUE | Leverages model relationships |
| 9 | Use **SELECTEDVALUE** over VALUES | Returns scalar directly |
| 10 | Use **TREATAS** over INTERSECT | Better performance for virtual relationships |
| 11 | Use **ADDCOLUMNS** with SUMMARIZE, not calculated columns in SUMMARIZE | Avoids context transition issues |
| 12 | Avoid **FORMAT** in calculations | Converts to text, kills aggregation |
| 13 | Avoid converting **BLANKs** to values | Can be expensive |
| 14 | Avoid **EARLIER** | Use variables instead |
| 15 | Consider **IF.EAGER** | When branch fusion is possible |
| 16 | Use **CALCULATETABLE** over FILTER for table filtering | Table-level filter, generally faster |
| 17 | Avoid unnecessary **ALL** | Only when you explicitly need to remove context |
| 18 | Prefer **measures over calculated columns** | On-demand vs stored; smaller model |

---

## § 5 — Testing & Validation

After creating or modifying any measure, **always test it**.

### Quick Validation via MCP

```
dax_query_operations → operation: Execute
  query: "EVALUATE ROW( \"Result\", [Measure Name] )"
```

### Interpret Results

| Result | Action |
|---|---|
| **Error** | Fix expression and retry |
| **BLANK** | Verify data exists in context; document if expected |
| **Valid number** | Measure is production-ready |

### Performance Testing

1. Use **Performance Analyzer** in Power BI Desktop to identify slow visuals.
2. Use **DAX Studio** for query plans and server timings.
3. Compare multiple variations of complex measures — test with real data volumes.

### Batch Validation

Test all measures in a table at once:

```dax
EVALUATE { [Measure1], [Measure2], [Measure3] }
```

---

## § 6 — Standard Patterns

> Full patterns with before/after examples: [patterns.md](./references/patterns.md)

| Category | Example Measure | Key Function |
|---|---|---|
| Base aggregation | `Total Sales = SUM( Sales[Amount] )` | SUM, COUNTROWS, DISTINCTCOUNT |
| Time intelligence | `Sales YTD = TOTALYTD( [Total Sales], 'Date'[Date] )` | TOTALYTD, SAMEPERIODLASTYEAR, DATESINPERIOD |
| Ratios | `Profit Margin = DIVIDE( Revenue - Cost, Revenue )` | DIVIDE, REMOVEFILTERS |
| Conditional | `Sales Category = SWITCH( TRUE(), ... )` | SWITCH TRUE |
| Running total | `Running Total = CALCULATE( ..., Date <= CurrentDate )` | CALCULATE, REMOVEFILTERS |
| Weighted average | `Weighted Price = DIVIDE( SUMX(...), SUM(...) )` | SUMX, DIVIDE |

---

## § 7 — Division Rule

**Always** use `DIVIDE(numerator, denominator)` — **never** the `/` operator.

```dax
-- ❌ Risks error when Revenue is zero
Profit % = SUM( Sales[Profit] ) / SUM( Sales[Revenue] )

-- ✅ Returns BLANK (or alternate value) on zero
Profit % = DIVIDE( SUM( Sales[Profit] ), SUM( Sales[Revenue] ), 0 )
```

`DIVIDE` handles division-by-zero gracefully. Use the optional third argument to specify an alternate result (default: BLANK).

---

## § 8 — Cross-References

| Topic | Skill | Section |
|---|---|---|
| Measure organization & `_Measures` table | **powerbi-modeling** | § 8.1 Organization |
| Format strings (`#,0`, `$#,0.00`, etc.) | **powerbi-modeling** | § 8.3 Format Strings |
| Measure description requirements | **powerbi-modeling** | § 1.4 Descriptions & Metadata |
| Explicit measures over implicit | **powerbi-modeling** | § 1.5 Explicit Measures |
| Date table requirements for time intelligence | **powerbi-modeling** | § 9 Date Table & Time Intelligence |
| Fiscal calendar sourcing (Lam 4-4-3) | **powerbi-modeling** | § 9.5 Fiscal Calendar — CRITICAL |
