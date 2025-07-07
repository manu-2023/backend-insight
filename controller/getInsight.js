import mysql from 'mysql2/promise';
import dotenv from 'dotenv'
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

export const getInsight = async (req, res) => {
  try {
    const table_name = process.env.DB_INSIGHT_TABLE_NAME;

    const [rows] = await pool.query(
      `SELECT * FROM ${table_name} ORDER BY created_at DESC LIMIT 1`
    );

    if (rows.length <= 0) {
      return res.status(404).json({ message: 'No insights found !!' });
    }

    return res.status(200).json(rows[0]);

  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};
