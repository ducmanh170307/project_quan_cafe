const sql = require("mssql");
const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });
let poolPromise;
function configuration(overrides = {}) {
  const raw = process.env.DB_SERVER || "localhost";
  const [server, instance] = raw.split("\\");
  const options = {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== "false",
    abortTransactionOnError: true,
    useUTC: true,
  };
  if (instance) options.instanceName = instance;
  const config = {
    user: process.env.DB_USER || "sa",
    password: process.env.DB_PASSWORD,
    server,
    database:
      process.env.DB_DATABASE || process.env.DB_NAME || "CoffeeChainCafeV4",
    connectionTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 5000),
    requestTimeout: 15000,
    pool: { min: 0, max: 10, idleTimeoutMillis: 30000 },
    options,
    ...(!instance && process.env.DB_PORT
      ? { port: Number(process.env.DB_PORT) }
      : {}),
    ...overrides,
  };
  return config;
}
function connectDB() {
  if (!poolPromise) {
    const config = configuration();
    if (!config.password)
      return Promise.reject(
        Object.assign(
          new Error("Chưa cấu hình DB_PASSWORD trong backend/.env."),
          { code: "EDBCONFIG" },
        ),
      );
    const pool = new sql.ConnectionPool(config);
    pool.on("error", () => {
      poolPromise = null;
    });
    poolPromise = pool.connect().catch(async (err) => {
      poolPromise = null;
      await pool.close().catch(() => {});
      throw err;
    });
  }
  return poolPromise;
}
async function query(statement, params = {}, transaction = null) {
  const executor = transaction || (await connectDB());
  const request = new sql.Request(executor);
  for (const [name, value] of Object.entries(params)) {
    const type =
      value instanceof Date
        ? sql.DateTime2
        : typeof value === "boolean"
          ? sql.Bit
          : typeof value === "number"
            ? Number.isInteger(value) && Math.abs(value) <= 2147483647
              ? sql.Int
              : sql.Decimal(18, 3)
            : sql.NVarChar(sql.MAX);
    request.input(name, type, value === undefined ? null : value);
  }
  return request.query(statement);
}
async function tx(work) {
  const transaction = new sql.Transaction(await connectDB());
  let begun = false,
    rolledBack = false;
  transaction.on("rollback", () => {
    rolledBack = true;
  });
  try {
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    begun = true;
    const value = await work(transaction);
    await transaction.commit();
    return value;
  } catch (err) {
    if (begun && !rolledBack) await transaction.rollback().catch(() => {});
    throw err;
  }
}
async function close() {
  const p = poolPromise;
  poolPromise = null;
  if (p) await (await p.catch(() => null))?.close();
}
module.exports = { sql, configuration, connectDB, query, tx, close };
