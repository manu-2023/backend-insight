import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
});

const restore = async (req, res) => {
  try {
    console.log('📥 Restore API hit');

    const tableName = process.env.DB_INSIGHT_TABLE_NAME;

    // Delete most recent row
    const [deleteResult] = await pool.query(
      `DELETE FROM ${tableName} ORDER BY created_at DESC LIMIT 1`
    );

    if (deleteResult.affectedRows > 0) {
      console.log("✅ Row deleted successfully");
    } else {
      console.log("⚠️ No row deleted (maybe table is empty)");
    }

    // Fetch new latest insight
    const [rows] = await pool.query(
      `SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 1`
    );
    const insight = rows.length ? rows[0] : null;

    console.log("🧹 Deleted recent record. ✅ New latest record:", insight);

    res.status(200).json({ message: 'Restored to previous insight', insight });
  } catch (err) {
    console.error('❌ Error during restore:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

export default restore;
