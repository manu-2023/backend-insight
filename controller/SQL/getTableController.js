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

export const getTableController = async (req, res) => {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    const tableNames = rows.map(row => Object.values(row)[0]);
    res.json({ tables: tableNames });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch table names' });
  }
};

export default {getTableController};
