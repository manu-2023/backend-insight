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

const savePermission = async (req, res) => {
    const { source_type, donorName } = req.body;

    try {
        if (!source_type) {
            return res.status(400).json({ error: 'Source type is missing!' });
        }

        console.log('📥 Inserting permission...');
        console.log('📦 Source Type:', source_type);
        console.log('👤 Donor Name:', donorName);

        const table_name = process.env.DB_MAIN_INSIGHT_TABLE_NAME;
        const second_insight_table_name = process.env.DB_INSIGHT_TABLE_NAME;

        // Step 1: Get last insight
        const [second_insight] = await pool.query(
            `SELECT insight FROM ${second_insight_table_name} ORDER BY created_at DESC LIMIT 1`
        );
        if (second_insight.length === 0) {
            return res.status(404).json({ error: 'No insights found in the second table' });
        }

        // Step 2: Delete that insight
        const [deletedRows] = await pool.query(
            `DELETE FROM ${second_insight_table_name} ORDER BY created_at DESC LIMIT 1`
        );
        if (deletedRows.affectedRows === 0) {
            return res.status(404).json({ error: 'No rows deleted from the second table' });
        }

        // Step 3: Insert into main table
        const query = `INSERT INTO ${table_name} (insight, source_type, donor_name, created_at) VALUES (?, ?, ?, NOW())`;
        const [result] = await pool.execute(query, [
            second_insight[0].insight,
            source_type,
            donorName || null
        ]);

        if (result.affectedRows === 0) {
            return res.status(500).json({ error: 'Failed to save permission' });
        }

        return res.status(200).json({ message: 'Permission saved successfully' });

    } catch (err) {
        console.error('❌ DB Insert Error:', err.message);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default savePermission;
