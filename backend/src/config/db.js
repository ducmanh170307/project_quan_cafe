const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const dbConfig = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '123456',
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'CoffeeChainSystem',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

let poolPromise = null;
const connectDB = async () => {
    try {
        if (!poolPromise) {
            poolPromise = await sql.connect(dbConfig);
            console.log('✅ Đã kết nối SQL Server: CoffeeChainSystem');
        }
        return poolPromise;
    } catch (err) {
        console.warn('⚠️ Chế độ Offline Demo:', err.message);
        throw err;
    }
};

module.exports = { sql, connectDB };