import mysql from 'mysql2/promise'
import dotenv from 'dotenv'
dotenv.config();


const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
export const getColumnsSQL = async (req, res) => {
    try {
        const { tableName } = req.body;

        if (!tableName || tableName == null) {
            res.status(200).json({ message: 'Table has been not selected' });
            return
        }
        const columns = `SHOW COLUMNS FROM ${tableName}`;
        const [rows] = await pool.query(columns)
        if (!rows || rows.length == 0) {
            res.status(200).json({ message: 'No columns found !!' })
        }
        const cols = rows.map(value =>value.Field)
        res.status(200).json({ columns: cols })

    }

    catch(err) {
        res.status(200).json({error:'Internal Server error'})
    }
}

export default {getColumnsSQL}