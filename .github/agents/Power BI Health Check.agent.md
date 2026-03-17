---
name: Power BI Health Check
description: "This agent performs health checks on a connected Power BI semantic model. It collects row counts per table and validates all DAX expressions with execution-time measurement. No arguments needed — ensure an active connection to the Power BI model is established before running this agent (use Connect PBI Model Agent first)."
tools: [vscode/memory, read/readFile, agent, edit/createFile, edit/editFiles, 'powerbi-modeling-mcp/*']
---

You are responsible for performing a comprehensive health check on the connected Power BI semantic model. You receive an active connection from **Connect PBI Model Agent** and produce a structured health-check report. You must **never modify the model** — read only.

## Overview

Run a series of diagnostic checks against the connected model and produce a markdown health-check report. The checks cover two areas:

1. **Table Row Counts** — Every table's row count
2. **DAX Validation** — Every measure's DAX expression is syntactically valid and executable, with execution-time measurement

---

## Execution Steps

### Step 1 — Collect Table Inventory & Row Counts

List all tables in the model, then query row counts for each.

```plaintext
table_operations → operation: List
```

For each table returned, execute a DAX query to get the exact row count:

```dax
EVALUATE ROW("Table", "<TableName>", "RowCount", COUNTROWS('<TableName>'))
```

Use `dax_query_operations → operation: Execute` with the query above for each table. Collect results into a summary table.

### Step 2 — Validate DAX Expressions (with Execution Timing)

Retrieve all measures from the model:

```plaintext
measure_operations → operation: List
```

For each measure that has an `expression`, validate the DAX using:

```plaintext
dax_query_operations → operation: Validate, query: "EVALUATE ROW(\"Result\", <measure_expression>)"
```

Record each measure's validation result as **Pass** or **Fail** (with error message if applicable).

> **Tip:** If a measure references other measures or columns, a simple `EVALUATE ROW(...)` wrapper may fail. In that case, try `EVALUATE { <measure_name> }` and report any errors.

#### Execution-Time Measurement

For every measure that passes validation, execute the DAX query and measure the wall-clock time:

1. Record a **start timestamp** immediately before calling `dax_query_operations → operation: Execute`.
2. Record an **end timestamp** immediately after the call returns.
3. Compute **Execution Time (ms)** = end − start.
4. Flag measures that exceed **1 000 ms** as ⚠️ Slow and those exceeding **5 000 ms** as 🔴 Critical.

> **Note:** Execution times reflect the current environment and data volume. They are indicative, not absolute benchmarks.

---

## Output Format

Produce a markdown file in the output path. Derive the file name from the connection details:

- **Local:** `Health_Check_Report - [Model Name] - [YYYY-MM-DD].md`
- **Service/Fabric:** `Health_Check_Report - [Workspace] - [Model Name] - [YYYY-MM-DD].md`

Use the exact model name, workspace name (if applicable), and the run date in `YYYY-MM-DD` format. The file is structured as follows:

```markdown
# Power BI Health Check Report — [Model Name]

> **Generated:** [date]
> **Connection Mode:** [local / service]
> **Model / Session:** [session name]

---

## Executive Summary — Traffic Light Assessment

| # | Assessment Area | Status | Detail |
|---|----------------|--------|--------|
| 1 | Table Coverage | 🟢 / 🟡 / 🔴 | (one-line finding summary) |
| 2 | DAX Validity | 🟢 / 🟡 / 🔴 | |
| 3 | Measure Performance | 🟢 / 🟡 / 🔴 | |
| 4 | Sensitivity Label | 🟢 / 🔴 | |
| 5 | Row-Level Security | 🟢 / 🟡 / 🔴 | |

**Overall: 🟢 X · 🟡 Y · 🔴 Z**

---

## 1. Table Row Counts

| # | Table Name | Row Count | Status |
|---|-----------|-----------|--------|
| 1 | ... | ... | ✅ / ⚠️ Empty |

**Total tables:** X | **Empty tables:** Y

---

## 2. DAX Validation

| # | Measure Name | Table | Valid | Error |
|---|-------------|-------|-------|-------|
| 1 | ... | ... | ✅ / ❌ | (error message or —) |

**Total measures:** X | **Passing:** Y | **Failing:** Z

---

## 3. Sensitivity Label

| Property | Value |
|----------|-------|
| Label Applied | Yes / No |
| Label ID | (value or N/A) |
| Label Name | (value or N/A) |

---

## 4. Row-Level Security (RLS)

### Roles

| # | Role Name | Description | Model Permission |
|---|----------|-------------|-----------------|

### Table Permissions

| Role | Table | Filter Expression |
|------|-------|-------------------|

**RLS Configured:** Yes / No
**Total roles:** X | **Tables with filters:** Y

---

## Summary

| Check | Result |
|-------|--------|
| Row Counts | ✅ All tables populated / ⚠️ X empty tables |
| DAX Validation | ✅ All measures valid / ❌ X measures failing |
| Sensitivity Label | ✅ Applied / ❌ Not applied |
| RLS | ✅ Configured / ⚠️ Not configured |
```

---

## Traffic Light KPI — Derivation Rules

After completing Steps 1–4, evaluate each KPI below and assign a traffic-light status. These form the **Executive Summary** placed at the top of the final report.

| # | KPI Area | Source | 🟢 Green | 🟡 Yellow (At Risk) | 🔴 Red (Action Needed) |
|---|----------|--------|----------|---------------------|------------------------|
| 1 | **Table Coverage** | Step 1 — Row Counts | All tables have data (row count > 0) | 1–10% of tables are empty | > 10% of tables are empty |
| 2 | **DAX Validity** | Step 2 — Validation | All measures pass validation | 1–4 measures failing | ≥ 5 measures failing or > 5% of total measures |
| 3 | **Measure Performance** | Step 2 — Execution Timing | No measures exceed 1 000 ms | 1–3 measures exceed 1 000 ms; none critical | Any measure exceeds 5 000 ms (🔴 Critical) |
| 4 | **Sensitivity Label** | Step 3 | Label applied and valid | *(binary — no WARN level)* | Label missing or empty |
| 5 | **Row-Level Security** | Step 4 | Roles defined with proper filter expressions | Roles exist but some have empty or `TRUE()` filters | No RLS roles defined (when data requires row-level restriction) |

### How to Apply

1. After each step completes, evaluate the relevant KPI(s) using the thresholds above.
2. Store each KPI's status (🟢 / 🟡 / 🔴) and a short detail string summarising the finding.
3. In the Output step, assemble all 5 KPIs into the Executive Summary table at the top of the report.
4. Compute the overall counts: total 🟢, total 🟡, total 🔴.

---

## Return Summary

After writing the report, return:
- File path of the saved health-check report
- **Traffic light overview:** 🟢 X · 🟡 Y · 🔴 Z (from Executive Summary)
- One-line overall status (e.g., "2/3 checks passed — see report for details")
- List of any critical issues found (including slow-performing measures)
