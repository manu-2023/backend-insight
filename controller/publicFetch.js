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

export const publicFetch = async (req, res) => {
    let { donor_name } = req.body;
    try {
        const table_name = process.env.DB_MAIN_INSIGHT_TABLE_NAME;

        let query;
        let values = [];

        if (donor_name && donor_name.trim() !== '') {
            // ✅ Donor name is given — fetch latest matching donor
            query = `SELECT * FROM ${table_name} WHERE donor_name = ? ORDER BY created_at DESC LIMIT 1`;
            values = [donor_name.trim()];
        } else {
            // ✅ No donor name — fetch where donar_name is NULL or ''
            query = `SELECT * FROM ${table_name} WHERE donor_name IS NULL OR donor_name = '' ORDER BY created_at DESC LIMIT 1`;
            values = [];
        }

        const [rows] = await pool.execute(query, values);

        if (rows.length === 0) {
            return res.status(404).json({ message: 'No insights found !!' });
        }

        return res.status(200).json(rows[0]);

    } catch (err) {
        console.error('❌ Error fetching insight:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default publicFetch;
