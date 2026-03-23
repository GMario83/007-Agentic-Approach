# M-Code Anti-Pattern Reference

## Overview

Scan each M expression for common anti-patterns that affect portability, performance, maintainability, and reliability. Each anti-pattern has a severity level and a recommended remediation.

---

## Anti-Pattern Checklist

### 1. Hardcoded Server / Database Names

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | Server names, database names appear as literal strings in the M expression instead of referencing Power Query parameters |
| **Example** | `Sql.Database("server01.database.windows.net", "SalesDB")` |
| **Remediation** | Extract server and database into Power Query parameters for environment portability |

```powerquery
// ❌ Hardcoded
Source = Sql.Database("server01.database.windows.net", "SalesDB")

// ✅ Parameterised
Source = Sql.Database(ServerName, DatabaseName)
```

---

### 2. Hardcoded File Paths

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | Literal paths like `C:\...`, `\\server\share\...`, or `D:\...` appear in the expression |
| **Remediation** | Use Power Query parameters or relative paths |

```powerquery
// ❌ Hardcoded
Source = Excel.Workbook(File.Contents("C:\Data\targets.xlsx"))

// ✅ Parameterised
Source = Excel.Workbook(File.Contents(FilePath & "targets.xlsx"))
```

---

### 3. Missing Parameters for Environment Values

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | Connection strings, URLs, or service endpoints appear as literals without parameterisation |
| **Remediation** | Extract all environment-specific values (server, database, path, URL, workspace ID) into Power Query parameters |

---

### 4. Non-Foldable Steps After Foldable Source

| Field | Detail |
|---|---|
| **Severity** | ❌ FAIL |
| **Detection** | Fold-breaking M operations (see foldability.md) appear after a source that supports query folding |
| **Remediation** | Reorder steps to place foldable operations first; move complex logic to a native query or post-load DAX; ref powerbi-modeling § 3.2 |

```powerquery
// ❌ Table.AddColumn breaks folding after SQL source
Source = Sql.Database("server", "db"),
Filtered = Table.SelectRows(Source, each [Status] = "Active"),
Added = Table.AddColumn(Filtered, "Custom", each Text.Upper([Name]))
// → Filtered folds; Added and everything after does NOT

// ✅ Push logic to native query or reorder
Source = Value.NativeQuery(
    Sql.Database("server", "db"),
    "SELECT *, UPPER(Name) AS Custom FROM dbo.Table WHERE Status = 'Active'"
)
```

---

### 5. Excessive Step Count

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | More than 15 `let ... in` bindings in a single query expression |
| **Remediation** | Break into a staging query (source + basic filters) and a transformation query (references staging). Disable load on the staging query. |

---

### 6. Table.Buffer Usage

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | `Table.Buffer(...)` present in the M expression |
| **Remediation** | Usually unnecessary — forces full materialisation in memory. Only valid when the same table is referenced multiple times in a merge and performance testing confirms a benefit. Remove if not justified. |

---

### 7. Duplicate Source Connections

| Field | Detail |
|---|---|
| **Severity** | ⚠️ WARN |
| **Detection** | Multiple tables connect to the same server + database + schema with different filter/select patterns that could be consolidated |
| **Remediation** | Create a single staging query referencing the shared source, then build individual queries as references to the staging query with specific filters/projections |

---

### 8. No Error Handling on Source

| Field | Detail |
|---|---|
| **Severity** | ℹ️ INFO |
| **Detection** | No `try ... otherwise` around source connection steps |
| **Remediation** | Consider wrapping source connection in `try ... otherwise` for resilience — especially for file-based or web sources that may be intermittently unavailable |

```powerquery
// ℹ️ Basic error handling pattern
Source = try Sql.Database(ServerName, DatabaseName) otherwise error "Connection failed"
```

---

## Severity Guide

| Severity | Meaning | Action Required |
|---|---|---|
| ❌ FAIL | Causes measurable performance degradation or correctness risk | Must fix — include in remediation plan as High priority |
| ⚠️ WARN | Affects portability, maintainability, or may cause issues at scale | Should fix — include as Medium priority |
| ℹ️ INFO | Recommended best practice improvement | Consider fixing — include as Low priority |
