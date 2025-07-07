import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

const getCellValuesSQL = async (req, res) => {
    try {
        let { tableName, columnName } = req.body;

        if (!tableName || !columnName || columnName.length === 0) {
            return res.status(400).json({ error: 'Table name and column name(s) are required' });
        }

        // If columnName is not an array, convert to array
        if (!Array.isArray(columnName)) {
            columnName = [columnName];
        }

        const selectedColumns = columnName.map(col => `\`${col}\``).join(', ');
        const query = `SELECT DISTINCT ${selectedColumns} FROM \`${tableName}\``;
        const [rows] = await pool.query(query);

        // Transform rows into { columnName: [distinctValues] }
        const result = {};
        columnName.forEach(col => {
            result[col] = [...new Set(rows.map(row => row[col]).filter(val => val !== null && val !== ''))];
        });

        return res.status(200).json(result);


    } catch (err) {
        console.error('SQL Error:', err.message);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};


export default getCellValuesSQL;

