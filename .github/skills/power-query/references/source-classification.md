# Source Classification Reference

## Overview

Parse each M expression to classify the primary data source kind. Look at the **Source step** — typically the first `let ... in` binding — to identify the connector function.

> **Tip:** Some M expressions chain multiple steps. Always look at the `Source` step first. If the expression uses a reference to another query, trace back to the original source.

---

## Full Classification Table

| M Function Pattern | Source Kind | Notes |
|---|---|---|
| `Sql.Database(...)` / `Sql.Databases(...)` | SQL Server | Includes Azure SQL, SQL MI |
| `Oracle.Database(...)` | Oracle | |
| `PostgreSQL.Database(...)` | PostgreSQL | |
| `MySQL.Database(...)` | MySQL | |
| `Snowflake.Databases(...)` | Snowflake | |
| `GoogleBigQuery.Database(...)` | BigQuery | |
| `Databricks.Catalogs(...)` | Databricks | |
| `AzureDataExplorer.Contents(...)` | Azure Data Explorer | Also known as Kusto |
| `Odbc.DataSource(...)` / `Odbc.Query(...)` | ODBC | Generic — note the DSN or driver |
| `OData.Feed(...)` | OData | |
| `Web.Contents(...)` / `Web.Page(...)` | Web / REST API | |
| `Excel.Workbook(...)` | Excel | File-based — record full path |
| `Csv.Document(...)` | CSV / Text File | File-based — record full path |
| `SharePoint.Files(...)` / `SharePoint.Contents(...)` | SharePoint | |
| `AzureStorage.Blobs(...)` / `AzureStorage.DataLake(...)` | Azure Blob / ADLS | |
| `Lakehouse.Contents(...)` / `lakehouse(...)` | Fabric Lakehouse | Fabric-native |
| `Warehouse.Contents(...)` / `warehouse(...)` | Fabric Warehouse | Fabric-native |
| `PowerBI.Dataflows(...)` | Power BI Dataflow | |
| `Dataverse.Contents(...)` | Dataverse | |
| `AnalysisServices.Database(...)` | Analysis Services | Includes Azure AS and SSAS |
| `Denodo.Contents(...)` | Denodo | Denodo virtualization layer |
| Other / unrecognised | **Unknown** | Flag for manual review |

---

## Extraction Rules

### Connection Details

For each classified source, extract:

| Field | Where to Find |
|---|---|
| **Server / Host** | First string argument of the connector function |
| **Database / Catalog** | Second string argument (or named parameter) |
| **Schema** | Named parameter or subsequent navigation step |
| **Table / View** | Navigation step or explicit table name argument |
| **File Path** | Full path for file-based sources (Excel, CSV) |
| **URL** | Full URL for web-based sources (OData, Web, REST) |

### Examples

```powerquery
// SQL Server — extract server + database
Source = Sql.Database("server01.database.windows.net", "SalesDB")
// → Source Kind: SQL Server
// → Server: server01.database.windows.net
// → Database: SalesDB

// Excel — extract file path
Source = Excel.Workbook(File.Contents("\\share\files\targets.xlsx"))
// → Source Kind: Excel
// → File Path: \\share\files\targets.xlsx

// Fabric Lakehouse — extract workspace context
Source = Lakehouse.Contents(null){[workspaceId = "..."]}
// → Source Kind: Fabric Lakehouse

// Native SQL query
Source = Value.NativeQuery(Sql.Database("server01", "SalesDB"), "SELECT * FROM dbo.Sales")
// → Source Kind: SQL Server (with native query)
```

---

## Deduplication Rules

When building the source summary, aggregate per-table sources into a deduplicated view:

1. **Group by** Source Kind + Server/Connection + Database
2. **List** all tables using each unique source
3. **Note** storage modes per source group
4. **Flag** if the same logical source is accessed via different connection strings (potential inconsistency)
