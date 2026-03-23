---
name: power-query
description: >
  Use when assessing, reviewing, or writing Power Query (M) expressions in Power BI
  semantic models. Covers data source classification, M-code structural analysis,
  query foldability assessment, anti-pattern detection, and M-code best practices.
  Use alongside powerbi-modeling skill for model-level concerns (storage modes,
  star schema, relationships) and dax skill for DAX-specific guidance.
---

# Power Query (M-Code) Skill
> Covers M-code assessment, foldability, anti-patterns, and source classification.
> For model-level design (storage modes, relationships, schema), see **powerbi-modeling**.
> For DAX measure authoring, see **dax**.

---

## § 1 — Source Classification

> Full rules: [source-classification.md](./references/source-classification.md)

Parse each M expression's `Source` step (typically the first `let ... in` binding) to identify the primary data source.

| M Function Pattern | Source Kind |
|---|---|
| `Sql.Database(...)` | SQL Server |
| `Oracle.Database(...)` | Oracle |
| `PostgreSQL.Database(...)` | PostgreSQL |
| `Snowflake.Databases(...)` | Snowflake |
| `Databricks.Catalogs(...)` | Databricks |
| `Web.Contents(...)` | Web / REST API |
| `Excel.Workbook(...)` | Excel |
| `Lakehouse.Contents(...)` | Fabric Lakehouse |
| `Warehouse.Contents(...)` | Fabric Warehouse |
| Other / unrecognised | **Unknown** — flag for manual review |

> See full classification table (20+ source kinds) and extraction tips in [source-classification.md](./references/source-classification.md).

---

## § 2 — Structural Analysis

For each M expression, extract these metrics:

| Metric | How to Determine |
|---|---|
| **Step Count** | Count the number of `let ... in` bindings (variable assignments) |
| **Total Line Count** | Count lines in the expression |
| **Has Parameters** | Whether the expression references Power Query parameters (e.g., `#"ParamName"` or function parameters) |
| **Has Staging Query** | Whether this appears to be a staging/reference query (no final `Table.` transformations, used as source by other queries) |

### Complexity Thresholds

| Range | Status |
|---|---|
| ≤ 15 steps | ✅ Normal |
| 16–25 steps | ⚠️ Complex — consider splitting |
| > 25 steps | ❌ Excessive — must split into staging + transformation |

---

## § 3 — Query Foldability

> Full rules: [foldability.md](./references/foldability.md)

Assess whether the M expression folds (pushes operations to the data source).

### Foldable Source Kinds

SQL Server, Oracle, PostgreSQL, Snowflake, BigQuery, Databricks, Analysis Services, Fabric Warehouse, Azure Data Explorer.

### Operations That Typically Fold

`Table.SelectRows`, `Table.SelectColumns`, `Table.RemoveColumns`, `Table.Group`, `Table.Join`, `Table.NestedJoin`, `Table.RenameColumns`, `Table.TransformColumnTypes`.

### Operations That Typically Break Folding

`Table.AddColumn` (custom functions), `Table.Buffer`, `Table.Combine`, `Table.FromList`, `List.Generate`, `List.Accumulate`, custom M functions row-by-row, `Table.TransformColumns` (complex), `Table.Sort` (sometimes).

### Native Query Detection

Expression contains `Value.NativeQuery(...)` or `Sql.Database(..., [Query=...])`.

> See full assessment logic and decision tree in [foldability.md](./references/foldability.md).

---

## § 4 — Anti-Pattern Checklist

> Full rules with detection logic and remediation: [anti-patterns.md](./references/anti-patterns.md)

| # | Anti-Pattern | Severity | What to Check |
|---|---|---|---|
| 1 | Hardcoded server/database names | ⚠️ WARN | Literal server/database strings instead of parameters |
| 2 | Hardcoded file paths | ⚠️ WARN | Literal `C:\...` or `\\server\share\...` paths |
| 3 | Missing parameter for environment values | ⚠️ WARN | Connection strings without parameterisation |
| 4 | Non-foldable steps after foldable source | ❌ FAIL | Fold-breaking transformations after a foldable source |
| 5 | Excessive step count | ⚠️ WARN | More than 15 steps in a single query |
| 6 | Table.Buffer usage | ⚠️ WARN | `Table.Buffer(...)` present — usually unnecessary |
| 7 | Duplicate source connections | ⚠️ WARN | Multiple tables connect to the same source with different filter/select patterns |
| 8 | No error handling on source | ℹ️ INFO | No `try ... otherwise` around source connection steps |

---

## § 5 — Best Practices

> Full rules with examples: [best-practices.md](./references/best-practices.md)

| Best Practice | Reference | Expected |
|---|---|---|
| Vertical filtering (column projection) | powerbi-modeling § 2.1 | Unnecessary columns removed early via `Table.SelectColumns` / `Table.RemoveColumns` |
| Horizontal filtering (row filtering) | powerbi-modeling § 2.1 | Row-level filters applied at source, before aggregation |
| Foldable transformations | powerbi-modeling § 3.2 | No fold-breaking steps after foldable source |
| Native query verification | powerbi-modeling § 3.2 | DirectQuery sources verify native query generation |
| Fiscal calendar sourcing | powerbi-modeling § 9.5 | Fiscal calendar sourced from enterprise system, not generated in M |
| Parameterised connections | power-query § 4 #1–3 | All environment values use Power Query parameters |
| Staging query pattern | power-query § 2 | Complex queries split into staging + transformation |
| Disable query load for staging | powerbi-modeling § 2.1 | Staging/intermediate queries do not load to the model |

---

## § 6 — Cross-References

| Topic | Skill | Section |
|---|---|---|
| Data reduction (vertical & horizontal filtering) | **powerbi-modeling** | § 2.1 |
| Foldable transformations & native query | **powerbi-modeling** | § 3.2 |
| Fiscal calendar sourcing (Lam 4-4-3) | **powerbi-modeling** | § 9.5 |
| Storage modes (Import, DirectQuery, Dual, Direct Lake) | **powerbi-modeling** | § 2, § 3, § 4, § 5 |
| Incremental refresh for large fact tables | **powerbi-modeling** | § 2.2 |
| Column hygiene and hidden columns | **powerbi-modeling** | § 1.3 |
| Date table requirements for time intelligence | **powerbi-modeling** | § 9 |
