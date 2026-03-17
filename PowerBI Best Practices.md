# Power BI Modeling — Best Practices Guide

> **Version:** 1.1  
> **Last Updated:** 2026-02-25  
> **Purpose:** Reference guide for building optimized Power BI semantic models, differentiated by storage mode.
>
> **Change Log:**
>
> | Version | Date | Changes |
> |---------|------|---------|
> | 1.1 | 2026-02-25 | Added § 9.5 Fiscal Calendar — sourcing guidance for Lam 4-4-3 fiscal calendar (Fabric / Denodo Master Calendar, source-system tables, maintained files). Updated § 9.2 fiscal column notes. |
> | 1.0 | 2026-02-09 | Initial release. |

---

## Table of Contents

1. [General Best Practices (All Storage Modes)](#1-general-best-practices-all-storage-modes)
2. [Import Mode Best Practices](#2-import-mode-best-practices)
3. [DirectQuery Best Practices](#3-directquery-best-practices)
4. [Mixed / Composite Model Best Practices](#4-mixed--composite-model-best-practices)
5. [Direct Lake Best Practices (Fabric)](#5-direct-lake-best-practices-fabric)
6. [Star Schema Design](#6-star-schema-design)
7. [Relationship Design](#7-relationship-design)
8. [Measure & KPI Design](#8-measure--kpi-design)
9. [Date Table & Time Intelligence](#9-date-table--time-intelligence)
10. [Performance Optimization](#10-performance-optimization)
11. [Security](#11-security)
12. [References](#12-references)

---

## 1. General Best Practices (All Storage Modes)

### 1.1 Star Schema First

Always design for a **star schema** with clear dimension and fact table separation.

- Dimension tables: descriptive attributes, unique keys, filter/group role
- Fact tables: event/transactional data, foreign keys, numeric measures
- Avoid hybrid tables that mix dimensions and facts

> 📖 [Understand star schema and the importance for Power BI](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema)

### 1.2 Naming Conventions

| Object Type | Convention | Example |
|-------------|-----------|---------|
| Dimension tables | PascalCase, singular | `Customer`, `Product`, `Date` |
| Fact tables | PascalCase, prefixed or descriptive | `Sales`, `FactOrders`, `Inventory` |
| Measures table | Prefixed with underscore | `_Measures` |
| Measures | Title Case, descriptive | `Total Sales`, `YTD Revenue` |
| Calculated columns | PascalCase | `AgeBucket`, `FiscalQuarter` |
| Hidden columns | Same naming, but marked hidden | Keys, IDs, sort helpers |

### 1.3 Column Hygiene

- **Remove unnecessary columns** — only keep columns needed for reporting, relationships, and calculations
- **Hide technical columns** — surrogate keys, IDs, sort-by helpers
- **Set `SummarizeBy = None`** on key/ID columns to prevent accidental aggregation
- **Optimize data types** — use integers instead of text for keys when possible; avoid high-cardinality text columns

> 📖 [Data reduction techniques for Import modeling](https://learn.microsoft.com/en-us/power-bi/guidance/import-modeling-data-reduction)

### 1.4 Descriptions & Metadata Documentation

Every table and every measure **must** have a description set in the model. Descriptions are surfaced in Power BI Desktop field tooltips, Fabric/Service lineage views, and XMLA-connected tools. They make the model self-documenting and dramatically reduce onboarding time for new report authors.

#### Table Descriptions

| Table Type | Description Template | Example |
|------------|---------------------|---------|
| Dimension | "One row per [entity]. Contains [key attributes]." | "One row per unique customer. Contains customer demographics, segmentation, and region." |
| Fact | "One row per [grain]. Records [business event] with [key metrics]." | "One row per sales order line. Records revenue, quantity, and dates with foreign keys to dimensions." |
| Calendar | "System-generated date table covering [range]. Marked as the model date table." | "Date table from 2020-01-01 to 2027-12-31. Includes fiscal year columns (July start)." |
| Measures | "Organizational container for all explicit DAX measures. No data rows." | — |
| Bridge / Helper | "Bridge table enabling M:M relationship between [Table A] and [Table B]." | — |

#### Measure Descriptions

Every measure description should explain:
- **What** it calculates (formula semantics)
- **How** to interpret the result (business context)
- **Filter context** assumptions or dependencies

| Measure | Good Description |
|---------|------------------|
| Total Sales | "Sum of net sales amounts across all order lines. Responsive to all slicer/filter context." |
| YoY Sales % | "Year-over-year sales growth percentage. Compares current filter period to the same period last year. Returns BLANK if no prior year data." |
| Avg Order Value | "Average revenue per order. Calculated as Total Sales ÷ Order Count using DIVIDE for safe division." |

#### Column Descriptions

Prioritize descriptions for:
- Key/join columns (clarify the relationship)
- Measure-relevant numeric columns (explain what the value represents)
- Calculated columns (explain the business logic)
- Date columns (clarify business meaning: order date vs. ship date vs. delivery date)

> **Rule:** Descriptions are metadata — they cost nothing at query time and provide significant value. Never skip them.

### 1.5 Explicit Measures Over Implicit

Always create **explicit DAX measures** rather than relying on implicit column summarization:

- Explicit measures ensure consistent behavior across visuals
- Required for MDX-based tools (Analyze in Excel)
- Place all measures in a dedicated `_Measures` table with display folders

> 📖 [Measures in star schema](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#measures)

### 1.6 Disable Auto Date/Time

Turn off `Auto date/time` in Power BI Desktop options. Instead, create a dedicated date table:

- Reduces model bloat (hidden auto-tables are created per date column)
- Provides full control over calendar logic and hierarchies

> 📖 [Auto date/time guidance](https://learn.microsoft.com/en-us/power-bi/guidance/auto-date-time)

---

## 2. Import Mode Best Practices

### When to Use Import

- Data volume fits comfortably in memory (< capacity limits)
- Maximum interactivity and performance required
- Full transformation flexibility with Power Query
- Data doesn't change more frequently than refresh cadence allows

> 📖 [Import connections](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about#import-connections)

### 2.1 Data Reduction

| Technique | Description |
|-----------|-------------|
| **Vertical filtering** | Remove columns not needed for reporting or model structure |
| **Horizontal filtering** | Filter rows by time range or entity; don't load all history by default |
| **Group & summarize** | Pre-aggregate in Power Query when detail rows aren't needed |
| **Optimize data types** | Convert text-encoded numbers to integers; use value encoding over hash encoding |
| **Prefer Power Query columns** | Create calculated columns in Power Query (M) over DAX when possible — better compression |
| **Disable query load** | Staging/intermediate queries should not load to model |

> 📖 [Data reduction techniques](https://learn.microsoft.com/en-us/power-bi/guidance/import-modeling-data-reduction)

### 2.2 Incremental Refresh

For large fact tables with time-based data:

- Configure incremental refresh to only refresh recent partitions
- Keep historical partitions cached
- Optionally add a real-time DirectQuery partition for the latest data (Hybrid table)

> 📖 [Incremental refresh](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview)

### 2.3 Refresh Strategy

| License | Max Scheduled Refreshes/Day |
|---------|----------------------------|
| Pro | 8 |
| Premium / PPU | 48 |
| Fabric | Varies by SKU |

- Use **on-demand refresh** via API for event-driven updates
- Schedule refreshes during off-peak hours
- Monitor refresh durations and optimize long-running queries

---

## 3. DirectQuery Best Practices

### When to Use DirectQuery

- Data volume exceeds import capacity limits
- Near real-time data freshness is required
- Source-enforced security (SSO) must be respected
- Data sovereignty requires data to stay at source
- Source has built-in measures/semantics (e.g., SAP BW)

> 📖 [DirectQuery in Power BI](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about)

### 3.1 Source Performance

- **Validate source query performance** before choosing DirectQuery — aim for < 5 seconds per visual query
- Ensure proper **indexing** on join and filter columns (especially for SQL sources)
- Favor **integer keys** for joins
- Use **columnstore indexes** for analytical workloads (SQL Server, Synapse)
- Enable **result set caching** on the source if available

### 3.2 Model Design for DirectQuery

| Practice | Rationale |
|----------|-----------|
| Keep Power Query transformations **simple and foldable** | Non-foldable steps break pushdown and cause errors |
| Verify **native query generation** (`View Native Query`) | Ensures transformations are pushed to source |
| Avoid **joins on calculated/expression columns** | Materialize these in the source instead |
| Avoid **relative date filters** in Power Query | These become fixed literals; implement in DAX instead |
| Avoid **bidirectional cross-filtering** unless necessary | Creates cross-join queries that degrade performance |
| Enable **Assume Referential Integrity** | Allows INNER JOIN instead of OUTER JOIN |
| No **parent-child PATH functions** available | Must flatten hierarchies in the source |
| Limit **calculated columns** to row-level foldable expressions | Complex DAX in calc columns won't fold |
| **No automatic date hierarchy** — create explicit date table | Auto date/time not supported in DirectQuery |

> 📖 [DirectQuery limitations](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about#directquery-limitations)

### 3.3 Report Design for DirectQuery

- **Use query reduction options** — Apply buttons for slicers/filters
- **Limit visuals per page** — each visual generates one or more source queries
- **Disable unnecessary cross-highlighting/filtering interactions**
- **Apply key filters early** to reduce intermediate row counts
- **Dashboard tile refresh** default is hourly; can be set from 15 min to weekly

> 📖 [DirectQuery recommendations](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about#directquery-recommendations)

### 3.4 Source-Specific Considerations

| Source | Key Considerations |
|--------|--------------------|
| **PostgreSQL** | Case-sensitive identifiers; ensure B-tree indexes on join/filter cols |
| **MySQL** | Consistent collations; composite indexes for filter patterns |
| **Snowflake / BigQuery / Databricks** | Elastic scaling helps concurrency; watch cold start latency |
| **Azure Synapse / SQL / Fabric Warehouse** | Columnstore indexes + result set caching = strong acceleration |
| **Azure Data Explorer** | Projection pruning matters; select only required columns |
| **SAP BW / SAP HANA** | Measure resolution and hierarchy semantics drive patterns; avoid breaking folding |

> 📖 [Source-specific considerations](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about#source-specific-considerations-including-postgresql-and-mysql)

---

## 4. Mixed / Composite Model Best Practices

### When to Use Mixed / Composite

Mixed storage is the **recommended default** when:

- Fact tables are large but dimension tables are small
- You want interactive slicer/filter performance on dimensions
- Real-time fact data is needed but dimension data doesn't change often
- Multiple data sources must be blended

> 📖 [Composite models in Power BI](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-composite-models)

### 4.1 Storage Mode Assignment Strategy

| Table Type | Recommended Storage Mode | Reasoning |
|------------|--------------------------|-----------|
| Large fact tables | **DirectQuery** | Avoids importing massive data; queries run at source |
| Dimension tables | **Dual** | Cached for fast slicer rendering; can join with DQ facts via INNER JOIN |
| Small lookup tables | **Import** | Fast and minimal memory footprint |
| Aggregation tables | **Import** | Pre-aggregated data cached for common queries |
| Date/Calendar table | **Dual** | Used across all facts; Dual maximizes join flexibility |

### 4.2 Dual Storage Mode

Dual mode tables behave as **Import** when queried alone, and as **DirectQuery** when joined with DirectQuery tables:

- Always set shared dimension tables to Dual to avoid limited relationships
- Power BI Desktop will suggest Dual propagation when you change a table from DirectQuery to Import
- Keep Dual table data synchronized — stale cache can produce inconsistent results

> 📖 [Storage mode — Dual](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-storage-mode#propagation-of-the-dual-setting)

### 4.3 Aggregation Tables

Use aggregation tables to accelerate common DirectQuery queries:

- Import pre-aggregated summaries alongside DirectQuery detail tables
- Power BI automatically routes queries to the aggregation table when possible
- Define aggregation mappings (e.g., SUM of `SalesAmount` grouped by `Date` and `Product`)

> 📖 [Aggregations in Power BI](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-aggregations)

### 4.4 Security Considerations

- Composite models can move data between sources during query execution
- Assess sensitive data movement across source boundaries
- DirectQuery tables using SSO will pass user identity; Import tables won't

> 📖 [Composite model security implications](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-composite-models#security-implications)

---

## 5. Direct Lake Best Practices (Fabric)

### When to Use Direct Lake

- Data resides in **Microsoft Fabric Lakehouse or Warehouse** (OneLake)
- You want near-Import performance without scheduled refresh overhead
- Data volumes are large but OneLake delta tables are well-maintained

> 📖 [Direct Lake overview](https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview)

### 5.1 Key Practices

| Practice | Description |
|----------|-------------|
| **Optimize delta tables** | Ensure proper partitioning and V-Order optimization |
| **Minimize column count** | Direct Lake scans are column-based; fewer columns = faster |
| **Monitor guardrails** | If a guardrail is hit, Direct Lake falls back to DirectQuery |
| **Avoid complex M transformations** | Direct Lake works best with simple table references |
| **Use automatic sync** | Default behavior; turn off only if manual control needed |

### 5.2 Guardrail Awareness

Direct Lake has guardrails (row count, column count, table count limits per SKU). When exceeded:

- The table automatically falls back to DirectQuery behavior
- Monitor with Fabric capacity metrics
- Consider splitting very wide tables or reducing cardinality

> 📖 [Direct Lake guardrails](https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview#fallback)

---

## 6. Star Schema Design

### 6.1 Dimension Table Guidelines

- Each dimension table has a **single unique key column**
- Use **surrogate keys** (integer) rather than natural/business keys for relationships
- Denormalize snowflake dimensions into single tables when feasible (fewer tables, simpler model)
- Handle **slowly changing dimensions** appropriately (Type 1 = overwrite, Type 2 = versioning)
- Use **role-playing dimensions** (duplicate date table via Power Query reference) rather than multiple inactive relationships

> 📖 [Star schema — Dimension tables](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#dimension-tables)

### 6.2 Fact Table Guidelines

- Store only **foreign keys** and **numeric measures** in fact tables
- Load at a **consistent grain** (e.g., one row per order line, per day, per transaction)
- Use **degenerate dimensions** (order numbers in fact table) when a separate dim table adds no value
- Consider **factless fact tables** for many-to-many bridging

> 📖 [Star schema — Fact tables](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#fact-tables)

### 6.3 Junk Dimensions

Consolidate multiple low-cardinality attributes (status flags, boolean indicators) into a single **junk dimension** table:

- Reduces model clutter
- Creates one relationship instead of many

> 📖 [Star schema — Junk dimensions](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#junk-dimensions)

---

## 7. Relationship Design

### 7.1 Core Rules

| Rule | Implementation |
|------|---------------|
| **One-to-Many** is the standard | Dimension (1) → Fact (M) |
| **Single cross-filter direction** by default | Bidirectional only when explicitly needed |
| **One active relationship** per table pair | Use `USERELATIONSHIP()` for inactive role-playing relationships |
| **Avoid many-to-many** unless required | Use bridging tables for M:M dimension relationships |
| **Assume Referential Integrity** | Enable for DirectQuery tables to use INNER JOIN |
| **Integer keys for joins** | Faster than text/GUID joins, especially in DirectQuery |

> 📖 [Model relationships](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-relationships-understand)  
> 📖 [Relationship guidance — Active vs Inactive](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-active-inactive)  
> 📖 [Many-to-many relationship guidance](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-many-to-many)

### 7.2 Role-Playing Dimensions

For tables with multiple date relationships (OrderDate, ShipDate, DeliveryDate):

- Create separate date dimension queries via Power Query reference (or DAX calculated tables)
- Each copy gets its own active relationship
- Rename columns per role: `Ship Year`, `Delivery Month`

> 📖 [Role-playing dimensions](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema#role-playing-dimensions)

---

## 8. Measure & KPI Design

### 8.1 Organization

- All measures in a **dedicated `_Measures` table**
- Use **display folders** to categorize: `Base Measures`, `Time Intelligence`, `KPIs`, `Ratios`
- **No measures on fact or dimension tables** (except during prototyping)
- Every measure **must** have a `description` set (see § 1.4)

#### Display Folder Structure

A consistent display folder hierarchy makes the field list navigable and scalable. Apply these standard folders:

```
_Measures
  ├─ Base Measures        → SUM, COUNT, DISTINCTCOUNT, AVG, MIN, MAX
  ├─ Time Intelligence    → YTD, PY, YoY, rolling, MTD, QTD
  │    ├─ YTD              → YTD-specific measures (if many)
  │    └─ Prior Period     → PY, PM, etc.
  ├─ KPIs                 → Business KPIs, targets, thresholds
  ├─ Ratios               → Share of total, percentages, rates
  └─ Counts               → DISTINCTCOUNT and conditional counts
```

**Rules for display folders:**
- Use `\` (backslash) for subfolder nesting: `Time Intelligence\YTD`
- Keep folder names short and consistent (Title Case)
- If the model spans multiple business domains, add domain-level top folders:
  `Sales\Base Measures`, `Inventory\Base Measures`, `HR\KPIs`
- Group related measures together — a report author should be able to find any measure in ≤ 2 clicks
- Review and rebalance folders as the measure count grows; avoid folders with only 1–2 measures

#### Column Display Folders (Dimension Tables)

For wide dimension tables (≥15 visible columns), organize columns into display folders:

```
Customer
  ├─ Demographics     → Name, Gender, Age, BirthDate
  ├─ Geography        → Country, Region, City, PostalCode
  └─ Segmentation     → Segment, Tier, AccountType
```

- Apply via `update_column_properties` with the `display_folder` property
- Only apply to user-facing columns (hidden columns don’t need folders)

### 8.2 Standard Measure Patterns

| Category | Examples |
|----------|---------|
| **Base aggregations** | `Total Sales = SUM(Sales[Amount])`, `Order Count = COUNTROWS(Sales)` |
| **Averages & ratios** | `Avg Order Value = DIVIDE([Total Sales], [Order Count])` |
| **Distinctcount** | `Customer Count = DISTINCTCOUNT(Sales[CustomerID])` |
| **Time Intelligence** | `YTD Sales = TOTALYTD([Total Sales], 'Date'[Date])` |
| **Prior period** | `PY Sales = CALCULATE([Total Sales], SAMEPERIODLASTYEAR('Date'[Date]))` |
| **Year-over-Year** | `YoY % = DIVIDE([Total Sales] - [PY Sales], [PY Sales])` |
| **Rolling** | `Rolling 12M = CALCULATE([Total Sales], DATESINPERIOD('Date'[Date], MAX('Date'[Date]), -12, MONTH))` |
| **Share of total** | `Sales % of Total = DIVIDE([Total Sales], CALCULATE([Total Sales], REMOVEFILTERS(Product)))` |

### 8.3 Formatting Standards

| Data Type | Format String | Example Output |
|-----------|---------------|----------------|
| Whole numbers | `#,0` | 1,234 |
| Decimals | `#,0.00` | 1,234.56 |
| Percentages | `0.0%` | 12.3% |
| Currency (USD) | `$#,0.00` | $1,234.56 |
| Currency (EUR) | `€#,0.00` | €1,234.56 |
| Large numbers | `#,0,,M` | 1M |

### 8.4 DIVIDE over Division Operator

Always use `DIVIDE(numerator, denominator)` instead of `numerator / denominator`:

- Handles division by zero gracefully (returns BLANK or alternate value)
- Cleaner, more readable expressions

### 8.5 Measure Validation

Every measure **must be tested** after creation:

```dax
EVALUATE ROW("Result", [Measure Name])
```

- Error → fix expression and retry
- BLANK → verify data exists in context; document if expected
- Valid result → measure is production-ready

---

## 9. Date Table & Time Intelligence

### 9.1 Requirements

A proper date table must:

- Have a column with data type **Date** containing **contiguous dates** (no gaps)
- Cover the **full range** of dates in all fact tables
- Be **marked as a date table** in the model
- Be the **only table** used for time intelligence functions

### 9.2 Standard Date Table Columns

| Column | Data Type | Example | Notes |
|--------|-----------|---------|-------|
| Date | Date | 2026-02-09 | Primary key, marked as date column |
| Year | Integer | 2026 | |
| Quarter | Integer | 1 | |
| QuarterLabel | Text | Q1 | Sort by Quarter |
| Month | Integer | 2 | |
| MonthName | Text | February | Sort by Month |
| MonthShort | Text | Feb | Sort by Month |
| YearMonth | Text | 2026-02 | Sort by YearMonthSort |
| YearMonthSort | Integer | 202602 | Hidden, sort-by column |
| WeekOfYear | Integer | 6 | ISO or locale-based |
| DayOfWeek | Integer | 1 | |
| DayName | Text | Monday | Sort by DayOfWeek |
| DayOfMonth | Integer | 9 | |
| IsWeekend | Boolean | FALSE | |
| IsCurrentMonth | Boolean | TRUE | |
| FiscalYear | Integer | 2026 | Sourced from business — see § 9.5 |
| FiscalQuarter | Integer | 3 | Sourced from business — see § 9.5 |
| FiscalPeriod | Integer | 8 | Sourced from business — see § 9.5 |
| FiscalWeek | Integer | 22 | Sourced from business — see § 9.5 |

### 9.3 Standard Hierarchies

- **Calendar:** Year → Quarter → Month → Day
- **Fiscal:** FiscalYear → FiscalQuarter → Month
- **Weekly:** Year → WeekOfYear → DayOfWeek

### 9.4 Mark as Date Table

```
manage_schema → update_table, spec: {mark_date_table: true, date_column: "Date"}
```

> 📖 [Create date tables in Power BI](https://learn.microsoft.com/en-us/power-bi/guidance/model-date-tables)

### 9.5 Fiscal Calendar

> **Rule:** Never auto-generate fiscal calendar columns in DAX or M. Fiscal period definitions must be provided by the business / end user and loaded into the model as a source of truth.

#### Why This Matters

Lam Research uses a **4-4-3 fiscal calendar** (4 weeks – 4 weeks – 3 weeks per quarter) that includes **partial manual adjustments** (period-end shifts, holiday alignment). These adjustments are determined by Corporate Finance and cannot be reproduced by a formula. Generating fiscal columns with offset arithmetic (e.g., `INT((Month + offset) / 3)`) or similar patterns will **silently produce incorrect period assignments**, leading to mis-stated fiscal reporting with no obvious error.

#### Sourcing Hierarchy

| Priority | Source | Description |
|----------|--------|-------------|
| **1 — Preferred** | **Master Calendar table in Fabric / Denodo** | Use the enterprise Master Calendar table maintained in the Fabric Lakehouse or served through the Denodo virtualization layer. This is the **single source of truth** for fiscal periods across all reporting. Connect via DirectQuery or Direct Lake as appropriate. |
| **2 — Acceptable** | **Date / calendar table from the source system** | If no Master Calendar is available in Fabric / Denodo, query the fiscal calendar table directly from the source system (e.g., SAP fiscal period tables `T009` / `T009B`, ERP date dimensions). This keeps fiscal definitions system-managed. |
| **3 — Fallback** | **Maintained Excel / CSV from Finance** | If neither a platform calendar nor a source-system table exists, the Finance / Controlling team provides and maintains a fiscal mapping file that is imported into the model. Ownership and refresh cadence must be documented. |
| **✗ — Not acceptable** | **Generate in DAX / M** | Hard-coded offsets or formulas cannot account for 4-4-3 week boundaries or manual adjustments. **Do not use this approach.** |

#### Integration Pattern

Regardless of which source is used, the fiscal calendar must be **merged onto the Date table** in Power Query via the calendar date key so that fiscal columns (`FiscalYear`, `FiscalQuarter`, `FiscalPeriod`, `FiscalWeek`) become part of the **single date dimension** — not a separate table. This preserves the § 9.1 requirement that one date table is the sole basis for time intelligence.

```text
// Power Query merge pattern (pseudo-code)
Date table
  └─ Merge Queries → MasterCalendar on [Date] = [CalendarDate]
       └─ Expand: FiscalYear, FiscalQuarter, FiscalPeriod, FiscalWeek
```

#### Documentation Requirement

Per § 1.4, record the fiscal calendar source in the Date table's description. Example:

> *"Fiscal columns sourced from Fabric Master Calendar (Denodo view `dim_fiscal_calendar`). Lam 4-4-3 fiscal calendar with manual period-end adjustments maintained by Corporate Finance."*

---

## 10. Performance Optimization

### 10.1 General

| Area | Best Practice |
|------|---------------|
| **Columns** | Remove unused; minimize high-cardinality text columns |
| **Relationships** | Use integer keys; enable referential integrity for DQ |
| **Measures** | Keep simple; avoid complex iteration (SUMX over large tables) when SUM suffices |
| **Visuals** | Limit per page; use Apply button for slicers |
| **Cross-filtering** | Disable unnecessary interactions |
| **RLS** | Keep filter expressions simple; avoid CONTAINS on large tables |

### 10.2 Import-Specific

- Monitor model size — stay within capacity limits
- Use incremental refresh for large tables
- Optimize Power Query for parallelism and folding
- Avoid calculated tables/columns when Power Query alternatives exist

### 10.3 DirectQuery-Specific

- Target < 5 seconds per visual query at the source
- Use Performance Analyzer to identify slow visuals
- Add aggregation tables for frequently accessed summaries
- Set max DirectQuery connections appropriately (default: 10)
- Use query and result caching on the capacity

> 📖 [Performance Analyzer](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-performance-analyzer)  
> 📖 [DirectQuery performance diagnostics](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about#performance-diagnostics)

### 10.4 Composite-Specific

- Route common queries to Import aggregation tables
- Set Dual mode on all shared dimensions
- Monitor for limited relationships and resolve with Dual

---

## 11. Security

### 11.1 Row-Level Security (RLS)

- Define roles with simple DAX filter expressions
- Test with "View as role" in Power BI Desktop
- Use `USERPRINCIPALNAME()` for dynamic security
- Avoid complex CALCULATE expressions in RLS filters

### 11.2 DirectQuery SSO

- DirectQuery can pass user identity to the source for source-enforced security
- Requires gateway SSO configuration for on-premises sources
- Import tables do NOT support SSO passthrough

> 📖 [Row-level security overview](https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security)  
> 📖 [SSO for data gateways](https://learn.microsoft.com/en-us/power-bi/connect-data/service-gateway-sso-overview)

---

## 12. References

### Microsoft Learn — Core Documentation

| Topic | Link |
|-------|------|
| Star Schema Design | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/star-schema) |
| Storage Modes | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-storage-mode) |
| DirectQuery | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/connect-data/desktop-directquery-about) |
| Composite Models | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-composite-models) |
| Data Reduction Techniques | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/import-modeling-data-reduction) |
| Model Relationships | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-relationships-understand) |
| Aggregations | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-aggregations) |
| Direct Lake Overview | [learn.microsoft.com](https://learn.microsoft.com/en-us/fabric/get-started/direct-lake-overview) |
| Auto Date/Time Guidance | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/auto-date-time) |
| Performance Analyzer | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-performance-analyzer) |
| Incremental Refresh | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/connect-data/incremental-refresh-overview) |
| DAX Basics | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/transform-model/desktop-quickstart-learn-dax-basics) |
| Date Tables Guidance | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/model-date-tables) |
| RLS Overview | [learn.microsoft.com](https://learn.microsoft.com/en-us/fabric/security/service-admin-row-level-security) |
| SSO for Gateways | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/connect-data/service-gateway-sso-overview) |

### Microsoft Learn — Relationship Guidance

| Topic | Link |
|-------|------|
| Active vs Inactive Relationships | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-active-inactive) |
| Many-to-Many Relationships | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-many-to-many) |
| One-to-One Relationships | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-one-to-one) |
| Bidirectional Filtering | [learn.microsoft.com](https://learn.microsoft.com/en-us/power-bi/guidance/relationships-bidirectional-filtering) |

### Training & Certification

| Resource | Link |
|----------|------|
| Power BI Data Analyst Associate | [learn.microsoft.com](https://learn.microsoft.com/en-us/credentials/certifications/data-analyst-associate/) |
| Design Scalable Semantic Models | [learn.microsoft.com](https://learn.microsoft.com/en-us/training/modules/design-scalable-semantic-models/) |

---

*This best practices guide is a companion to the `PowerBI Instructions.md` baseline prompt and should be updated as new patterns and Microsoft guidance emerge.*
