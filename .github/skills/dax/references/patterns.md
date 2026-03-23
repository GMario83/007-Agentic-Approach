# Standard DAX Measure Patterns

## Base Aggregation

```dax
Total Sales = SUM( Sales[Amount] )
```

```dax
Order Count = COUNTROWS( Sales )
```

```dax
Customer Count = DISTINCTCOUNT( Sales[CustomerID] )
```

```dax
Avg Order Value =
VAR TotalSales = [Total Sales]
VAR Orders = [Order Count]
VAR Result =
    DIVIDE( TotalSales, Orders )
RETURN
    Result
```

---

## Time Intelligence

> Use time intelligence acronyms as suffixes — see [naming conventions](./naming-conventions.md) for the full acronym table.

### Year-to-Date (YTD)

```dax
Sales YTD = TOTALYTD( [Total Sales], 'Date'[Date] )
```

### Quarter-to-Date (QTD)

```dax
Sales QTD = TOTALQTD( [Total Sales], 'Date'[Date] )
```

### Month-to-Date (MTD)

```dax
Sales MTD = TOTALMTD( [Total Sales], 'Date'[Date] )
```

### Previous Year (PY)

```dax
Sales PY =
    CALCULATE(
        [Total Sales],
        SAMEPERIODLASTYEAR( 'Date'[Date] )
    )
```

### Year-over-Year (YOY)

```dax
Sales YOY =
VAR CurrentSales = [Total Sales]
VAR PriorYearSales = [Sales PY]
VAR Result =
    CurrentSales - PriorYearSales
RETURN
    Result
```

### Year-over-Year % (YOY%)

```dax
Sales YOY % =
VAR CurrentSales = [Total Sales]
VAR PriorYearSales = [Sales PY]
VAR Result =
    DIVIDE( CurrentSales - PriorYearSales, PriorYearSales )
RETURN
    Result
```

### Rolling 12 Months (MAT)

```dax
Sales MAT =
    CALCULATE(
        [Total Sales],
        DATESINPERIOD( 'Date'[Date], MAX( 'Date'[Date] ), -12, MONTH )
    )
```

### Previous Year-to-Date (PYTD)

```dax
Sales PYTD =
    CALCULATE(
        [Total Sales],
        SAMEPERIODLASTYEAR( 'Date'[Date] ),
        DATESYTD( 'Date'[Date] )
    )
```

---

## Ratios & Percentages

### Share of Total

```dax
Sales % of Total =
VAR CurrentSales = [Total Sales]
VAR AllSales =
    CALCULATE( [Total Sales], REMOVEFILTERS( Product ) )
VAR Result =
    DIVIDE( CurrentSales, AllSales )
RETURN
    Result
```

### Margin

```dax
Profit Margin =
VAR TotalRevenue = SUM( Sales[Revenue] )
VAR TotalCost = SUM( Sales[Cost] )
VAR Result =
    DIVIDE( TotalRevenue - TotalCost, TotalRevenue )
RETURN
    Result
```

---

## Conditional Logic

### SWITCH TRUE Pattern

```dax
Sales Category =
    SWITCH(
        TRUE(),
        Sales[Revenue] > 3000, "High",
        Sales[Revenue] > 1000, "Medium",
        "Low"
    )
```

### Conditional Count

```dax
High Value Orders =
    COUNTROWS(
        FILTER( Sales, Sales[Revenue] > 1000 )
    )
```

---

## Filtering Patterns

### CALCULATE with Filter Removal

```dax
Sales Ignoring Region =
    CALCULATE(
        [Total Sales],
        REMOVEFILTERS( Customer[Region] )
    )
```

### CALCULATE with Cross-filter

```dax
Sales for Selected Products =
    CALCULATE(
        [Total Sales],
        TREATAS(
            VALUES( Product[Category] ),
            Sales[ProductCategory]
        )
    )
```

---

## Iterator Patterns

### Weighted Average

```dax
Weighted Avg Price =
VAR TotalWeight = SUM( Sales[Quantity] )
VAR WeightedSum =
    SUMX( Sales, Sales[Quantity] * Sales[UnitPrice] )
VAR Result =
    DIVIDE( WeightedSum, TotalWeight )
RETURN
    Result
```

### Running Total

```dax
Running Total Sales =
VAR CurrentDate = MAX( 'Date'[Date] )
VAR Result =
    CALCULATE(
        [Total Sales],
        'Date'[Date] <= CurrentDate,
        REMOVEFILTERS( 'Date' )
    )
RETURN
    Result
```
