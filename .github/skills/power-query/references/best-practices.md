# M-Code Best Practices Reference

## Overview

These best practices ensure Power Query (M) expressions are performant, maintainable, and aligned with the Power BI modeling skill rules. Each practice references the relevant section from `powerbi-modeling` or `power-query` skills.

---

## 1. Vertical Filtering — Column Projection

**Reference:** powerbi-modeling § 2.1

Remove columns not needed for reporting, relationships, or calculations **as early as possible** in the query.

```powerquery
// ✅ Explicit column selection early in the query
Source = Sql.Database(Server, Database),
Sales = Source{[Schema="dbo", Item="Sales"]}[Data],
SelectedColumns = Table.SelectColumns(Sales, {"OrderID", "CustomerID", "Amount", "OrderDate"}),
// ... further transformations on reduced column set
```

**What to check:**
- Are columns explicitly selected or removed early (within the first 3–5 steps)?
- Are there wide tables loaded without column projection?
- Are audit columns, internal IDs, or unused text columns still present?

---

## 2. Horizontal Filtering — Row Filtering

**Reference:** powerbi-modeling § 2.1

Apply row-level filtering at the source to reduce data volume before any transformation.

```powerquery
// ✅ Filter rows early — this folds to SQL WHERE clause
Filtered = Table.SelectRows(Source, each [OrderDate] >= #date(2023, 1, 1))
```

**What to check:**
- Are historical rows filtered by date range?
- Are inactive/deleted/archived records excluded at source?
- Do filters appear before aggregation and transformation steps?

---

## 3. Foldable Transformations

**Reference:** powerbi-modeling § 3.2

Keep Power Query steps foldable — ensure transformations translate to native source queries.

**What to check:**
- Do all steps after the Source fold? (Use `View Native Query` in Power Query Editor to verify)
- Are fold-breaking operations (Table.AddColumn with custom functions, Table.Buffer) avoided?
- If folding must break, does it break as late as possible in the step chain?

---

## 4. Native Query Verification

**Reference:** powerbi-modeling § 3.2

For DirectQuery sources, verify that native query generation works for all steps.

**What to check:**
- Can all DQ steps generate a native query?
- Are native queries (Value.NativeQuery) used appropriately for complex logic?
- Are native queries parameterised to prevent SQL injection?

---

## 5. Fiscal Calendar Sourcing

**Reference:** powerbi-modeling § 9.5 — **CRITICAL (Lam Research)**

Fiscal calendar columns must be sourced from an enterprise system, **never generated in M or DAX**.

| Priority | Source | Description |
|---|---|---|
| **1 — Preferred** | Master Calendar in Fabric / Denodo | Single source of truth for fiscal periods |
| **2 — Acceptable** | Source system fiscal table | e.g., SAP `T009` / `T009B` |
| **3 — Fallback** | Finance-maintained Excel / CSV | Finance team provides and maintains |
| **✗ — Prohibited** | Generate in DAX / M | Hard-coded offsets fail on Lam 4-4-3 boundaries |

**What to check:**
- Are fiscal columns (FiscalYear, FiscalQuarter, FiscalPeriod, FiscalWeek) merged from an external source?
- Is there any `Date.Month` arithmetic or offset logic generating fiscal periods?

---

## 6. Parameterised Connections

**Reference:** power-query § 4 #1–3

All environment-specific values must use Power Query parameters.

**What to check:**
- Are server names, database names, file paths, and URLs parameterised?
- Can the model be pointed to a different environment (dev/test/prod) by changing parameters alone?
- Are parameters documented with descriptions?

---

## 7. Staging Query Pattern

**Reference:** power-query § 2

Complex queries should be split into staging (source + basic filters) and transformation queries.

```
Staging Query (load disabled)
  └─ Source connection + basic filters + column projection
       └─ Transformation Query 1 (references staging)
       └─ Transformation Query 2 (references staging)
```

**What to check:**
- Are queries with > 15 steps split into staging + transformation?
- Do staging queries have **load disabled** (`Enable Load = false`)?
- Do multiple queries referencing the same source share a common staging query?

---

## 8. Disable Query Load for Staging

**Reference:** powerbi-modeling § 2.1

Staging and intermediate queries must not load data into the model.

**What to check:**
- Are helper/staging queries that exist only to feed other queries marked with `Enable Load = false`?
- Are there unnecessary tables loaded that serve no reporting or relationship purpose?

---

## Assessment Matrix

| # | Best Practice | Reference | ✅ PASS | ⚠️ WARN | ❌ FAIL |
|---|---|---|---|---|---|
| 1 | Vertical filtering | § 2.1 | Columns explicitly selected/removed in all tables | 1–2 tables missing projection | > 2 tables with no column projection |
| 2 | Horizontal filtering | § 2.1 | All large tables have row filters | 1–2 large tables without filters | > 2 large tables without filters |
| 3 | Foldable transformations | § 3.2 | No fold-breaking steps after foldable source | Potential breaks (⚠️) detected | Confirmed breaks (❌) detected |
| 4 | Native query verification | § 3.2 | All DQ sources support native query | Some DQ sources not verified | DQ sources with known fold failures |
| 5 | Fiscal calendar sourcing | § 9.5 | Fiscal columns from enterprise source | Source documented but not ideal tier | Fiscal columns generated in M/DAX |
| 6 | Parameterised connections | § 4 | All environment values parameterised | 1–2 hardcoded values | ≥ 3 hardcoded values |
| 7 | Staging query pattern | § 2 | Complex queries properly split | 1–2 complex queries not split | > 2 complex queries not split |
| 8 | Query load disabled for staging | § 2.1 | All staging queries load-disabled | 1–2 staging queries still loading | > 2 staging queries loading |
