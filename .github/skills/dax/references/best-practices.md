# DAX Best Practices

## Code Quality & Maintainability

### Use Explicit Measures Over Implicit

Define measures explicitly rather than relying on automatic aggregation. Makes intent clear and calculations reusable.

```dax
-- ❌ Calculated Column (adds storage, slows refresh)
TotalPrice = Sales[Quantity] * Sales[UnitPrice]

-- ✅ Measure (calculates on demand, context-aware)
Total Price = SUMX( Sales, Sales[Quantity] * Sales[UnitPrice] )
```

### Use Variables for Readability and Performance

Store intermediate calculations to avoid repeated evaluations.

```dax
-- ❌ Repeats SUM(Sales[Revenue]) twice
Profit Margin =
    (SUM( Sales[Revenue] ) - SUM( Sales[Cost] )) / SUM( Sales[Revenue] )

-- ✅ Each value calculated once
Profit Margin =
VAR TotalRevenue = SUM( Sales[Revenue] )
VAR TotalCost = SUM( Sales[Cost] )
VAR Result =
    DIVIDE( TotalRevenue - TotalCost, TotalRevenue )
RETURN
    Result
```

### Use SWITCH Instead of Nested IF

More readable, easier to maintain, often better performance.

```dax
-- ❌ Nested IF
Sales Category =
    IF(
        Sales[Revenue] > 3000, "High",
        IF( Sales[Revenue] > 1000, "Medium", "Low" )
    )

-- ✅ SWITCH TRUE
Sales Category =
    SWITCH(
        TRUE(),
        Sales[Revenue] > 3000, "High",
        Sales[Revenue] > 1000, "Medium",
        "Low"
    )
```

### Use DAX User-Defined Functions

Create reusable functions for common calculation patterns. Improves maintainability and consistency across measures.

---

## Error Handling & Safety

### Use DIVIDE for Safe Division

`DIVIDE()` automatically handles division by zero — returns BLANK or an alternate value.

```dax
-- ❌ Risks division-by-zero error
Profit % = SUM( Sales[Profit] ) / SUM( Sales[Revenue] )

-- ✅ Safe, returns 0 when Revenue is zero or BLANK
Profit % = DIVIDE( SUM( Sales[Profit] ), SUM( Sales[Revenue] ), 0 )
```

### Avoid Converting BLANKs to Values

BLANK-to-value conversions can be expensive. Let BLANK propagate naturally unless business logic requires a specific value.

### Avoid FORMAT for Calculations

`FORMAT()` converts numbers to text, killing performance. Apply formatting in Power BI visuals, not in DAX.

```dax
-- ❌ Returns text, breaks aggregation
Formatted Sales = FORMAT( SUM( Sales[Revenue] ), "₹#,##0" )

-- ✅ Returns number, format in visual
Total Sales = SUM( Sales[Revenue] )
```

---

## Performance Optimization

### Iterator Functions

- **Avoid nesting iterators** (e.g., `SUMX(, SUMX(,))`) — nested iterations are O(n²).
- **Limit iterators over large tables** — pre-aggregate data when possible.
- Use variables to cache intermediate results within iterators.

### Filter on Columns, Not Tables

```dax
-- ❌ Scans entire table row by row
FILTER( Products, Products[Colour] = "Red" )

-- ✅ Scans only the column
FILTER( VALUES( Products[Colour] ), Products[Colour] = "Red" )
```

### Avoid FILTER as a Filter Argument

Use Boolean expressions as filter arguments whenever possible. Import tables are optimized for column-based filtering. Only use `FILTER()` when necessary for:
- Measures in the filter condition
- Multiple columns in the condition
- OR logic

### Avoid Unnecessary ALL

`ALL()` removes context — only use when explicitly needed (e.g., share-of-total calculations).

```dax
-- ❌ Unnecessary ALL
Total Sales = CALCULATE( SUM( Sales[Revenue] ), ALL( Sales[Region] ) )

-- ✅ Only if you actually need to ignore Region filter
Total Sales = CALCULATE( SUM( Sales[Revenue] ) )
```

### Use CALCULATETABLE Over FILTER for Table Filtering

```dax
-- ❌ Row-by-row evaluation
HighSales = FILTER( Sales, Sales[Revenue] > 1000 )

-- ✅ Table-level filter application
HighSales = CALCULATETABLE( Sales, Sales[Revenue] > 1000 )
```

> Note: Both are valid — choose based on context. `CALCULATETABLE` is generally more efficient.

---

## Function Selection

### COUNTROWS Over COUNT

`COUNTROWS()` is more efficient, doesn't consider BLANKs in any column, and is self-describing.

```dax
-- ❌
Order Count = COUNT( Sales[OrderID] )

-- ✅
Order Count = COUNTROWS( Sales )
```

### SELECTEDVALUE Over VALUES

When determining if a single value is present in filter context, `SELECTEDVALUE()` returns a scalar directly and handles multi-selection automatically.

### RELATED Over LOOKUPVALUE

Prefer relationships and `RELATED()` — `LOOKUPVALUE` can cause performance issues with large datasets.

```dax
-- ❌ Performance risk on large tables
Product Category = LOOKUPVALUE( Category[Name], Category[ID], Sales[CategoryID] )

-- ✅ Uses model relationship
Product Category = RELATED( Category[Name] )
```

### Consider IF.EAGER

When branch fusion is possible, `IF.EAGER()` can improve performance by allowing the query engine to optimize both branches.

### Test Performance Variations

Use Performance Analyzer + DAX Studio to compare multiple variations of complex measures. Use query plans to understand performance characteristics.

---

## Filtering & Context

### Use KEEPFILTERS to Preserve Existing Filters

`KEEPFILTERS()` ensures that new filter conditions are intersected with (not replace) existing filters.

### Use TREATAS Over INTERSECT

`TREATAS()` has better performance characteristics for virtual relationships.

### Avoid EARLIER

Use variables or row context transitions instead — more readable, less confusing than multiple row contexts.

---

## Table Functions

### SUMMARIZE Only for Grouping

- Do NOT add calculated columns in `SUMMARIZE()`.
- Use `ADDCOLUMNS()` or `SUMMARIZECOLUMNS()` for calculations.
- Avoids context transition issues.

```dax
-- ❌ Calculated column in SUMMARIZE
SUMMARIZE( Sales, Product[Category], "Total", SUM( Sales[Amount] ) )

-- ✅ ADDCOLUMNS wrapping SUMMARIZE
ADDCOLUMNS(
    SUMMARIZE( Sales, Product[Category] ),
    "Total", [Total Sales]
)
```
