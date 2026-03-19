-- DocumentationAuditSummary — Table Creation
-- Target: Fabric SQL Warehouse / Lakehouse SQL analytics endpoint
-- Run once to provision the table.

IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_NAME = 'DocumentationAuditSummary'
)
BEGIN
    CREATE TABLE DocumentationAuditSummary (
        AuditId                  BIGINT IDENTITY(1,1) NOT NULL,
        RunTimestamp             DATETIME2            NOT NULL,
        WorkspaceName            NVARCHAR(256)        NOT NULL,
        SemanticModelName        NVARCHAR(256)        NOT NULL,

        -- Overall counts
        TotalGreen               INT NOT NULL DEFAULT 0,
        TotalYellow              INT NOT NULL DEFAULT 0,
        TotalRed                 INT NOT NULL DEFAULT 0,

        -- 14 Individual KPIs (status: 'GREEN', 'YELLOW', 'RED')
        KPI_StarSchema           NVARCHAR(10) NOT NULL,
        KPI_RelationshipDesign   NVARCHAR(10) NOT NULL,
        KPI_ColumnHygiene        NVARCHAR(10) NOT NULL,
        KPI_AutoDateTime         NVARCHAR(10) NOT NULL,
        KPI_StorageModes         NVARCHAR(10) NOT NULL,
        KPI_NamingConventions    NVARCHAR(10) NOT NULL,
        KPI_UnusedColumns        NVARCHAR(10) NOT NULL,
        KPI_MeasureQuality       NVARCHAR(10) NOT NULL,
        KPI_DescriptionCoverage  NVARCHAR(10) NOT NULL,
        KPI_MeasureOrganisation  NVARCHAR(10) NOT NULL,
        KPI_IntroTable           NVARCHAR(10) NOT NULL,
        KPI_ModelSizeCardinality NVARCHAR(10) NOT NULL,
        KPI_SensitivityLabel     NVARCHAR(10) NOT NULL,
        KPI_RowLevelSecurity     NVARCHAR(10) NOT NULL,

        -- Model metadata
        TableCount               INT NULL,
        MeasureCount             INT NULL,
        RelationshipCount        INT NULL,
        EstimatedSizeMB          DECIMAL(10,2) NULL,

        -- Artifact reference
        DocumentationFilePath    NVARCHAR(1000) NULL,

        -- Audit metadata
        CreatedAt                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
        UpdatedAt                DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT PK_DocumentationAuditSummary PRIMARY KEY (AuditId),
        CONSTRAINT UQ_Audit_Run UNIQUE (RunTimestamp, WorkspaceName, SemanticModelName)
    );

    PRINT 'Table DocumentationAuditSummary created successfully.';
END
ELSE
BEGIN
    PRINT 'Table DocumentationAuditSummary already exists — skipping creation.';
END
