import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 10
});

const savePermission = async (req, res) => {
    const { id, permission, donarName } = req.body;
    try {
        if (!permission || !id ) {
            return res.status(400).json({ error: 'Permission, ID, and Donor name are all required fields.' });
        }
        const table_name = process.env.DB_INSIGHT_TABLE_NAME;
        const column_name = 'privacy';
        const donar_name_column = 'donar_name';
        const query = `UPDATE ${table_name} SET ${column_name} = ? ,${donar_name_column}= ? WHERE id = ?`;
        const [result] = await pool.execute(query, [permission, donarName,id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'No record found to update' });
        }

        else {
            return res.status(200).json({ message: 'Permission updated successfully' });
        }

    }
    catch (err) {
        return res.status(500).json({ error: 'Internal server error' });

    }
}

export default savePermission;