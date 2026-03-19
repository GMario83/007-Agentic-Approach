/**
 * fabric-sql-exec.mjs
 *
 * Executes T-SQL statements against a Fabric SQL endpoint.
 * Reads connection parameters from .github/config/fabric-sql-config.json.
 *
 * Usage:
 *   node .github/scripts/fabric-sql-exec.mjs --file <path-to-sql-file>
 *   node .github/scripts/fabric-sql-exec.mjs --query "SELECT 1 AS Test"
 *
 * Authentication: Uses Entra ID (Azure AD) Interactive via @azure/identity DefaultAzureCredential.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../config/fabric-sql-config.json");

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--file" && args[i + 1]) opts.file = args[++i];
    else if (args[i] === "--query" && args[i + 1]) opts.query = args[++i];
    else if (args[i] === "--help") {
      console.log(
        "Usage:\n  node fabric-sql-exec.mjs --file <sql-file>\n  node fabric-sql-exec.mjs --query \"<sql>\""
      );
      process.exit(0);
    }
  }
  if (!opts.file && !opts.query) {
    console.error("Error: Provide --file <path> or --query \"<sql>\"");
    process.exit(1);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// Load config
// ---------------------------------------------------------------------------
function loadConfig() {
  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const cfg = JSON.parse(raw).fabricSql;
    if (!cfg?.endpoint || !cfg?.database) {
      throw new Error("Missing endpoint or database in config");
    }
    // Split "host,port" format
    const [server, portStr] = cfg.endpoint.split(",");
    return {
      server: server.trim(),
      port: portStr ? parseInt(portStr.trim(), 10) : 1433,
      database: cfg.database,
    };
  } catch (err) {
    console.error(`Failed to load config from ${CONFIG_PATH}:`, err.message);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Get Entra ID access token via @azure/identity
// ---------------------------------------------------------------------------
async function getAccessToken() {
  let azIdentity;
  try {
    azIdentity = await import("@azure/identity");
  } catch {
    console.error(
      "Error: @azure/identity not found. Install it:\n  npm install @azure/identity"
    );
    process.exit(1);
  }

  const scope = "https://database.windows.net/.default";

  // Strategy 1: Try DefaultAzureCredential (works if Azure CLI / managed identity / env vars are set)
  try {
    console.log("Trying DefaultAzureCredential...");
    const cred = new azIdentity.DefaultAzureCredential();
    const token = await cred.getToken(scope);
    console.log("Authenticated via DefaultAzureCredential.");
    return token.token;
  } catch {
    console.log("DefaultAzureCredential unavailable, falling back...");
  }

  // Strategy 2: DeviceCodeCredential — prints a code to the terminal, user authenticates in browser
  try {
    console.log("Using DeviceCodeCredential (follow the prompt below)...");
    const cred = new azIdentity.DeviceCodeCredential({
      userPromptCallback: (info) => {
        console.log("\n========================================");
        console.log(info.message);
        console.log("========================================\n");
      },
    });
    const token = await cred.getToken(scope);
    console.log("Authenticated via DeviceCodeCredential.");
    return token.token;
  } catch (err) {
    console.error("DeviceCodeCredential failed:", err.message);
  }

  console.error("All authentication methods failed.");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Execute SQL via tedious
// ---------------------------------------------------------------------------
async function executeSql(config, sqlText) {
  let tedious;
  try {
    tedious = await import("tedious");
  } catch {
    console.error(
      "Error: tedious not found. Install it:\n  npm install tedious"
    );
    process.exit(1);
  }

  const { Connection, Request } = tedious;
  const token = await getAccessToken();

  return new Promise((resolveP, rejectP) => {
    const conn = new Connection({
      server: config.server,
      authentication: {
        type: "azure-active-directory-access-token",
        options: { token },
      },
      options: {
        database: config.database,
        port: config.port,
        encrypt: true,
        trustServerCertificate: false,
        rowCollectionOnRequestCompletion: true,
      },
    });

    conn.on("connect", (err) => {
      if (err) {
        rejectP(new Error(`Connection failed: ${err.message}`));
        return;
      }
      console.log(
        `Connected to ${config.server}:${config.port} / ${config.database}`
      );

      // Split on GO batches (common in DDL scripts)
      const batches = sqlText
        .split(/^\s*GO\s*$/im)
        .map((b) => b.trim())
        .filter(Boolean);

      let batchIdx = 0;
      const allRows = [];

      function runNextBatch() {
        if (batchIdx >= batches.length) {
          conn.close();
          resolveP(allRows);
          return;
        }

        const batch = batches[batchIdx++];
        console.log(`\n--- Executing batch ${batchIdx}/${batches.length} ---`);
        console.log(batch.substring(0, 200) + (batch.length > 200 ? "..." : ""));

        const request = new Request(batch, (reqErr, rowCount, rows) => {
          if (reqErr) {
            console.error(`Batch ${batchIdx} failed:`, reqErr.message);
            conn.close();
            rejectP(reqErr);
            return;
          }
          console.log(`Batch ${batchIdx} OK — ${rowCount} row(s) affected`);

          // Collect result rows if any
          if (rows && rows.length > 0) {
            for (const row of rows) {
              const obj = {};
              for (const col of row) {
                obj[col.metadata.colName] = col.value;
              }
              allRows.push(obj);
            }
          }

          runNextBatch();
        });

        conn.execSql(request);
      }

      runNextBatch();
    });

    conn.on("error", (err) => {
      rejectP(new Error(`Connection error: ${err.message}`));
    });

    conn.connect();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs();
  const config = loadConfig();

  let sqlText;
  if (opts.file) {
    const filePath = resolve(process.cwd(), opts.file);
    sqlText = readFileSync(filePath, "utf-8");
    console.log(`Loaded SQL from: ${filePath}`);
  } else {
    sqlText = opts.query;
  }

  console.log(
    `Target: ${config.server}:${config.port} / ${config.database}`
  );
  console.log("Authenticating via Entra ID (DefaultAzureCredential)...\n");

  try {
    const rows = await executeSql(config, sqlText);
    if (rows.length > 0) {
      console.log("\n--- Results ---");
      console.table(rows);
    }
    console.log("\nDone.");
  } catch (err) {
    console.error("\nExecution failed:", err.message);
    process.exit(1);
  }
}

main();
