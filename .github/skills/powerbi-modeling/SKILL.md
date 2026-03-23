---
name: powerbi-modeling
description: >
  Apply this skill when the user asks about Power BI semantic model design,
  DAX measures, Power Query / M transformations, storage modes (Import,
  DirectQuery, Composite, Direct Lake), star schema, relationships, date tables,
  time intelligence, fiscal calendars, performance optimization, or row-level
  security. Always cite the relevant § when answering and flag any pattern the
  user describes that violates these rules.
---

# Power BI Modeling — Agent Skill Rules
> Version 1.1 | Last updated 2026-02-25 | Lam Research internal

---

## § 1 — General Rules (All Storage Modes)

### § 1.1 Star Schema
- Always design a **star schema**: separate dimension tables (descriptive attributes, unique keys) from fact tables (foreign keys + numeric measures).
- Never build hybrid tables that mix dimension and fact data.

### § 1.2 Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Dimension tables | PascalCase, singular | `Customer`, `Product`, `Date` |
| Fact tables | PascalCase, descriptive | `Sales`, `FactOrders`, `Inventory` |
| Measures table | Prefix with underscore | `_Measures` |
| Measures | Title Case, descriptive | `Total Sales`, `YTD Revenue` |
| Calculated columns | PascalCase | `AgeBucket`, `FiscalQuarter` |
| Hidden columns | Same naming, hidden flag | Keys, IDs, sort helpers |

> For detailed DAX naming conventions (measures, variables, UDFs, parameters), see the **dax** skill (§ 1).

### § 1.3 Column Hygiene
- Remove every column not needed for reporting, relationships, or calculations.
- Hide surrogate keys, IDs, and sort-by columns.
- Set `SummarizeBy = None` on all key/ID columns.
- Use integers instead of text for key columns; avoid high-cardinality text columns.

### § 1.4 Descriptions & Metadata
- Every **table** and every **measure** must have a description set in the model.
- Table description templates:
  - Dimension: *"One row per [entity]. Contains [key attributes]."*
  - Fact: *"One row per [grain]. Records [business event] with [key metrics]."*
  - Calendar: *"Date table covering [range]. Marked as the model date table."*
  - Measures: *"Organizational container for all explicit DAX measures. No data rows."*
- Measure descriptions must state: **what** it calculates, **how** to interpret it, and any filter-context assumptions.
- Prioritize column descriptions for: keys, measure-relevant numerics, calculated columns, and date columns.

### § 1.5 Explicit Measures
- Always create **explicit DAX measures**; never rely on implicit column summarization.
- Store all measures in a dedicated `_Measures` table with display folders.

### § 1.6 Disable Auto Date/Time
- Disable `Auto date/time` in Power BI Desktop options for every model.
- Instead, create a dedicated date table (see § 9).

---

## § 2 — Import Mode

**Use when:** data volume fits in memory, maximum interactivity is required, full Power Query transformation flexibility is needed, or data changes no faster than refresh cadence.

### § 2.1 Data Reduction

| Technique | Rule |
|---|---|
| Vertical filtering | Remove columns not needed for reporting or model structure |
| Horizontal filtering | Filter rows by time range or entity; do not load all history |
| Group & summarize | Pre-aggregate in Power Query when row-level detail is unnecessary |
| Data types | Convert text-encoded numbers to integers; prefer value encoding |
| Power Query columns | Build calculated columns in M (better compression) rather than DAX |
| Disable query load | Staging / intermediate queries must not load to the model |

### § 2.2 Incremental Refresh
- Configure incremental refresh on large fact tables with time-based data.
- Cache historical partitions; keep only recent partitions refreshing.
- Optionally add a real-time DirectQuery partition (Hybrid table) for the newest data.

### § 2.3 Refresh Limits

| License | Max Scheduled Refreshes/Day |
|---|---|
| Pro | 8 |
| Premium / PPU | 48 |
| Fabric | Varies by SKU |

- Use on-demand refresh via API for event-driven updates.
- Schedule refreshes during off-peak hours.

---

## § 3 — DirectQuery Mode

**Use when:** data volume exceeds import limits, near-real-time freshness is required, SSO source-enforced security must be respected, data sovereignty requires data at source, or source has built-in semantics (e.g., SAP BW).

### § 3.1 Source Performance
- Validate source query performance before choosing DirectQuery — target **< 5 seconds** per visual query.
- Require proper indexing on join and filter columns.
- Use integer keys for joins.
- Use columnstore indexes for analytical workloads (SQL Server, Synapse).

### § 3.2 Model Design Rules

| Rule | Implementation |
|---|---|
| Keep Power Query transformations simple and foldable | Non-foldable steps break pushdown |
| Verify native query generation | Use `View Native Query` to confirm pushdown |
| Avoid joins on calculated/expression columns | Materialize these in the source |
| Avoid relative date filters in Power Query | Implement in DAX instead |
| Avoid bidirectional cross-filtering unless necessary | Creates cross-join queries |
| Enable Assume Referential Integrity | Allows INNER JOIN instead of OUTER JOIN |
| No parent-child PATH functions | Flatten hierarchies in the source |
| Limit calculated columns to row-level foldable expressions | Complex DAX won't fold |
| No automatic date hierarchy | Create an explicit date table |

### § 3.3 Report Design Rules
- Enable query reduction options (Apply buttons on slicers/filters).
- Limit visuals per page — each visual generates one or more source queries.
- Disable unnecessary cross-highlighting/filtering interactions.
- Apply key filters early.

### § 3.4 Source-Specific Notes

| Source | Key Consideration |
|---|---|
| PostgreSQL | Case-sensitive identifiers; B-tree indexes on join/filter cols |
| MySQL | Consistent collations; composite indexes for filter patterns |
| Snowflake / BigQuery / Databricks | Watch cold start latency |
| Azure Synapse / SQL / Fabric Warehouse | Columnstore indexes + result set caching |
| Azure Data Explorer | Select only required columns |
| SAP BW / SAP HANA | Avoid breaking folding; respect hierarchy semantics |

---

## § 4 — Mixed / Composite Mode

**Use when:** fact tables are large but dimensions are small, interactive slicer performance is needed, real-time facts are required, or multiple sources must be blended.

### § 4.1 Storage Mode Assignment

| Table Type | Storage Mode | Reason |
|---|---|---|
| Large fact tables | DirectQuery | Avoids importing massive data |
| Dimension tables | Dual | Fast slicers; joins with DQ facts via INNER JOIN |
| Small lookup tables | Import | Fast and low memory footprint |
| Aggregation tables | Import | Cached pre-aggregated data |
| Date / Calendar table | Dual | Joins with all fact types |

### § 4.2 Dual Mode Rules
- Set all shared dimension tables to **Dual** to avoid limited relationships.
- Keep Dual table data synchronized — stale cache causes inconsistent results.

### § 4.3 Aggregation Tables
- Import pre-aggregated summaries alongside DirectQuery detail tables.
- Define aggregation mappings (e.g., SUM of `SalesAmount` grouped by `Date` and `Product`).
- Power BI will automatically route queries to the aggregation table when possible.

### § 4.4 Security
- Composite models can move data between sources during query execution — assess sensitive data movement.
- DirectQuery tables with SSO pass user identity; Import tables do not.

---

## § 5 — Direct Lake Mode (Fabric)

**Use when:** data resides in Fabric Lakehouse or Warehouse (OneLake), near-Import performance is wanted without scheduled refresh, and delta tables are well-maintained.

### § 5.1 Rules

| Rule | Description |
|---|---|
| Optimize delta tables | Ensure partitioning and V-Order optimization |
| Minimize column count | Direct Lake scans are column-based — fewer = faster |
| Monitor guardrails | Guardrail breach → automatic fallback to DirectQuery |
| Avoid complex M transformations | Keep table references simple |
| Use automatic sync | Disable only if manual control is explicitly needed |

### § 5.2 Guardrails
- Row count, column count, and table count limits apply per Fabric SKU.
- When exceeded, the table falls back to DirectQuery — monitor with Fabric capacity metrics.
- Resolve by splitting wide tables or reducing cardinality.

---

## § 6 — Star Schema Design

### § 6.1 Dimension Tables
- Each dimension table must have a **single unique key column**.
- Use **surrogate integer keys** (not natural/business keys) for relationships.
- Denormalize snowflake dimensions into single tables where feasible.
- Handle slowly changing dimensions: Type 1 (overwrite) or Type 2 (versioning).
- Implement **role-playing dimensions** via Power Query reference — do not use multiple inactive relationships as the primary pattern.

### § 6.2 Fact Tables
- Store only **foreign keys** and **numeric measures** in fact tables.
- Load at a consistent grain (e.g., one row per order line).
- Use **degenerate dimensions** (order number in fact) when a separate dim adds no value.
- Use **factless fact tables** for many-to-many bridging where appropriate.

### § 6.3 Junk Dimensions
- Consolidate multiple low-cardinality attributes (status flags, boolean indicators) into a single **junk dimension** table.

---

## § 7 — Relationship Design

### § 7.1 Core Rules

| Rule | Implementation |
|---|---|
| One-to-Many is standard | Dimension (1) → Fact (M) |
| Single cross-filter direction by default | Bidirectional only when explicitly required |
| One active relationship per table pair | Use `USERELATIONSHIP()` for inactive role-playing paths |
| Avoid many-to-many unless required | Use bridging tables for M:M dimension relationships |
| Assume Referential Integrity | Enable for DirectQuery tables to use INNER JOIN |
| Integer keys for joins | Faster than text/GUID joins, especially in DirectQuery |

### § 7.2 Role-Playing Dimensions
- For multiple date relationships (OrderDate, ShipDate, DeliveryDate), create separate date dimension queries via Power Query reference.
- Each copy gets its own active relationship with role-specific column names: `Ship Year`, `Delivery Month`.

---

## § 8 — Measure & KPI Design

### § 8.1 Organization
- All measures in a dedicated **`_Measures` table**.
- Use display folders to categorize:

```
_Measures
  ├─ Base Measures        → SUM, COUNT, DISTINCTCOUNT, AVG, MIN, MAX
  ├─ Time Intelligence    → YTD, PY, YoY, rolling, MTD, QTD
  │    ├─ YTD
  │    └─ Prior Period
  ├─ KPIs                 → Business KPIs, targets, thresholds
  ├─ Ratios               → Share of total, percentages, rates
  └─ Counts               → DISTINCTCOUNT and conditional counts
```

- Use `\` (backslash) for subfolder nesting: `Time Intelligence\YTD`
- If the model spans multiple domains, add domain-level top folders: `Sales\Base Measures`
- Never place measures on fact or dimension tables (except during prototyping).
- Every measure must have a description (§ 1.4).

#### Column Display Folders (Dimension Tables)
- For dimension tables with ≥ 15 visible columns, organize columns into display folders:

```
Customer
  ├─ Demographics     → Name, Gender, Age, BirthDate
  ├─ Geography        → Country, Region, City, PostalCode
  └─ Segmentation     → Segment, Tier, AccountType
```

### § 8.2 → See dax skill

For standard DAX measure patterns, formatting, and code examples, see the **dax** skill (§ 6 Standard Patterns).

### § 8.3 Format Strings

| Data Type | Format String | Example |
|---|---|---|
| Whole numbers | `#,0` | 1,234 |
| Decimals | `#,0.00` | 1,234.56 |
| Percentages | `0.0%` | 12.3% |
| Currency (USD) | `$#,0.00` | $1,234.56 |
| Currency (EUR) | `€#,0.00` | €1,234.56 |
| Large numbers | `#,0,,M` | 1M |

### § 8.4 → See dax skill

For the DIVIDE rule and DAX division best practices, see the **dax** skill (§ 7 Division Rule).

### § 8.5 → See dax skill

For measure testing and validation workflows (EVALUATE ROW pattern), see the **dax** skill (§ 5 Testing & Validation).

---

## § 9 — Date Table & Time Intelligence

### § 9.1 Requirements
- The date table must have a **Date** data-type column with **contiguous dates** (no gaps).
- It must cover the **full date range** of all fact tables.
- It must be **marked as a date table** in the model.
- It must be the **only table** used for time intelligence functions.

### § 9.2 Standard Date Table Columns

| Column | Data Type | Notes |
|---|---|---|
| Date | Date | Primary key, marked as date column |
| Year | Integer | |
| Quarter | Integer | |
| QuarterLabel | Text | Sort by Quarter |
| Month | Integer | |
| MonthName | Text | Sort by Month |
| MonthShort | Text | Sort by Month |
| YearMonth | Text | Sort by YearMonthSort |
| YearMonthSort | Integer | Hidden |
| WeekOfYear | Integer | |
| DayOfWeek | Integer | |
| DayName | Text | Sort by DayOfWeek |
| DayOfMonth | Integer | |
| IsWeekend | Boolean | |
| IsCurrentMonth | Boolean | |
| FiscalYear | Integer | Sourced from business — see § 9.5 |
| FiscalQuarter | Integer | Sourced from business — see § 9.5 |
| FiscalPeriod | Integer | Sourced from business — see § 9.5 |
| FiscalWeek | Integer | Sourced from business — see § 9.5 |

### § 9.3 Standard Hierarchies
- **Calendar:** Year → Quarter → Month → Day
- **Fiscal:** FiscalYear → FiscalQuarter → Month
- **Weekly:** Year → WeekOfYear → DayOfWeek

### § 9.4 Mark as Date Table
```
manage_schema → update_table, spec: {mark_date_table: true, date_column: "Date"}
```

### § 9.5 Fiscal Calendar — CRITICAL (Lam Research)

> **Rule:** Never auto-generate fiscal calendar columns in DAX or M. Fiscal period definitions must be provided by the business and loaded as a source of truth.

**Why:** Lam Research uses a **4-4-3 fiscal calendar** (4 weeks – 4 weeks – 3 weeks per quarter) with **partial manual adjustments** (period-end shifts, holiday alignment) determined by Corporate Finance. Offset arithmetic (e.g., `INT((Month + offset) / 3)`) will silently produce incorrect period assignments.

#### Sourcing Hierarchy

| Priority | Source | Description |
|---|---|---|
| **1 — Preferred** | Master Calendar in Fabric / Denodo | Single source of truth for fiscal periods. Connect via DirectQuery or Direct Lake. |
| **2 — Acceptable** | Source system fiscal table | e.g., SAP `T009` / `T009B` or ERP date dimensions. System-managed. |
| **3 — Fallback** | Finance-maintained Excel / CSV | Finance team provides and maintains the mapping file. Refresh cadence must be documented. |
| **✗ — Prohibited** | Generate in DAX / M | Hard-coded offsets cannot account for 4-4-3 boundaries or manual adjustments. Do not use. |

#### Integration Pattern
Merge fiscal columns onto the **Date table** in Power Query via the calendar date key — never as a separate table:

```
// Power Query merge pattern (pseudo-code)
Date table
  └─ Merge Queries → MasterCalendar on [Date] = [CalendarDate]
       └─ Expand: FiscalYear, FiscalQuarter, FiscalPeriod, FiscalWeek
```

#### Documentation Requirement
Record the fiscal calendar source in the Date table's description. Example:
> *"Fiscal columns sourced from Fabric Master Calendar (Denodo view `dim_fiscal_calendar`). Lam 4-4-3 fiscal calendar with manual period-end adjustments maintained by Corporate Finance."*

---

## § 10 — Performance Optimization

### § 10.1 General

| Area | Rule |
|---|---|
| Columns | Remove unused; minimize high-cardinality text columns |
| Relationships | Use integer keys; enable referential integrity for DQ |
| Measures | Keep simple; prefer SUM over SUMX on large tables |
| Visuals | Limit per page; use Apply button for slicers |
| Cross-filtering | Disable unnecessary interactions |
| RLS | Keep filter expressions simple; avoid CONTAINS on large tables |

### § 10.2 Import-Specific
- Monitor model size — stay within capacity limits.
- Use incremental refresh for large tables.
- Optimize Power Query for parallelism and folding.
- Prefer Power Query columns over DAX calculated columns.

### § 10.3 DirectQuery-Specific
- Target **< 5 seconds** per visual query at source.
- Use Performance Analyzer to identify slow visuals.
- Add aggregation tables for frequently accessed summaries.
- Use query and result caching on the capacity.

### § 10.4 Composite-Specific
- Route common queries to Import aggregation tables.
- Set Dual mode on all shared dimensions.
- Monitor for limited relationships and resolve with Dual.

---

## § 11 — Security

### § 11.1 Row-Level Security (RLS)
- Define roles with **simple DAX filter expressions**.
- Test with "View as role" in Power BI Desktop.
- Use `USERPRINCIPALNAME()` for dynamic security.
- Avoid complex CALCULATE expressions in RLS filters.
- Avoid `CONTAINS()` over large tables in RLS filters.

### § 11.2 DirectQuery SSO
- DirectQuery can pass user identity to the source for source-enforced security.
- Requires gateway SSO configuration for on-premises sources.
- Import tables do **not** support SSO passthrough.
