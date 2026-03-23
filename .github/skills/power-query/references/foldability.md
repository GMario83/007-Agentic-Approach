# Query Foldability Reference

## Overview

Query folding is the ability of Power Query to translate M-code transformations into native source queries (e.g., SQL). When folding works, the data source performs the heavy lifting — filtering, joining, and aggregating — instead of the Power Query engine.

---

## Foldable Source Kinds

These data sources support query folding:

| Source Kind | Folding Support |
|---|---|
| SQL Server (incl. Azure SQL) | ✅ Full |
| Oracle | ✅ Full |
| PostgreSQL | ✅ Full |
| MySQL | ✅ Full |
| Snowflake | ✅ Full |
| BigQuery | ✅ Full |
| Databricks | ✅ Full |
| Azure Data Explorer (Kusto) | ✅ Full |
| Analysis Services | ✅ Full |
| Fabric Warehouse | ✅ Full |
| Fabric Lakehouse (SQL endpoint) | ✅ Full |
| OData | ✅ Partial (limited operations) |
| ODBC (SQL-capable driver) | ✅ Partial (driver-dependent) |

These sources do **not** support folding:

| Source Kind | Folding Support |
|---|---|
| Excel | ❌ None |
| CSV / Text | ❌ None |
| Web / REST API | ❌ None |
| SharePoint Files | ❌ None |
| Azure Blob / ADLS (file-based) | ❌ None |
| Power BI Dataflow | ❌ None |
| Dataverse | ⚠️ Limited |

---

## Operations That Typically Fold

These M operations are generally translated into native queries:

| Operation | M Function | SQL Equivalent |
|---|---|---|
| Row filtering | `Table.SelectRows` | `WHERE` |
| Column selection | `Table.SelectColumns` | `SELECT` |
| Column removal | `Table.RemoveColumns` | `SELECT` (exclude) |
| Grouping / Aggregation | `Table.Group` | `GROUP BY` |
| Joins | `Table.Join` / `Table.NestedJoin` | `JOIN` |
| Column renaming | `Table.RenameColumns` | `AS` alias |
| Type conversion | `Table.TransformColumnTypes` | `CAST` / `CONVERT` |
| Sorting (simple) | `Table.Sort` | `ORDER BY` |
| Distinct (indexed) | `Table.Distinct` | `DISTINCT` |
| Top N rows | `Table.FirstN` | `TOP` / `LIMIT` |

---

## Operations That Typically Break Folding

These operations force the Power Query engine to pull data locally and process in-memory:

| Operation | M Function | Why It Breaks |
|---|---|---|
| Custom calculated columns | `Table.AddColumn` (with custom function) | Custom M logic has no SQL equivalent |
| Table buffering | `Table.Buffer` | Forces full materialisation in memory |
| Table combining | `Table.Combine` / `Table.FromList` | Merges heterogeneous sources locally |
| List generation | `List.Generate` / `List.Accumulate` | Iterative M logic, no SQL equivalent |
| Row-by-row custom functions | Custom function applied per row | Cannot translate arbitrary M to SQL |
| Complex transformations | `Table.TransformColumns` (complex) | Simple type conversions fold; custom logic does not |
| Pivot / Unpivot (sometimes) | `Table.Pivot` / `Table.Unpivot` | May fold on some sources, not others |

> **Key rule:** Once folding breaks at a step, **all subsequent steps** also run locally — even if they would normally fold. Step ordering matters.

---

## Native Query Detection

Native queries bypass M folding entirely — the M expression passes a raw query string directly to the source:

| Pattern | Detection |
|---|---|
| `Value.NativeQuery(source, "SELECT ...")` | Inline native SQL |
| `Sql.Database(server, db, [Query="SELECT ..."])` | Query option in source function |
| `Odbc.Query(dsn, "SELECT ...")` | ODBC native query |

**Assessment for native queries:**
- ✅ Folding is inherently maximal (entire query runs at source)
- ⚠️ Review the SQL for performance (missing indexes, SELECT *, etc.)
- ⚠️ Native queries cannot be further folded by subsequent M steps

---

## Assessment Logic

For each non-template table with an M expression:

```
1. Identify source kind from Source step
2. Determine if source supports folding (table above)
3. If foldable source:
   a. Walk each step after Source
   b. Check each step against fold/break tables
   c. Mark the FIRST fold-breaking step (if any)
   d. All steps after the break are also non-folded
4. If non-foldable source:
   → No folding possible — note in report
5. If native query:
   → Mark as "Native Query — fully pushed to source"
```

### Status Classification

| Status | Meaning |
|---|---|
| ✅ Clean | Foldable source, no fold-breaking steps detected |
| ⚠️ Potential break | Steps detected that *sometimes* break folding (Table.Sort, Table.Distinct) |
| ❌ Confirmed break | Steps detected that *always* break folding (Table.AddColumn with custom fn, Table.Buffer) |
| N/A | Source does not support folding (Excel, CSV, Web) |
| Native | Native query used — fully pushed to source |
