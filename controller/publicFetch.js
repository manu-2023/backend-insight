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
    let { donar_name } = req.body;
    try {
        const table_name = process.env.DB_INSIGHT_TABLE_NAME;

        if (!donar_name) {
            donar_name = '';
        }

        // const [rows] = await pool.execute(
        //     `SELECT * FROM ${table_name}
        //      WHERE privacy = 'public'
        //      AND (donar_name = ? OR ? = '')
        //      ORDER BY created_at DESC
        //      LIMIT 1`,
        //     [donar_name, donar_name]
        // );
        const resolvedDonar = donar_name === null || donar_name === undefined ? '' : donar_name;

        const [rows] = await pool.execute(
            `SELECT * FROM ${table_name}
   WHERE privacy = 'public'
   AND donar_name = ?
   ORDER BY created_at DESC
   LIMIT 1`,
            [resolvedDonar]
        );



        if (rows.length <= 0) {
            return res.status(404).json({ message: 'No insights found !!' });
        }

        return res.status(200).json(rows[0]);

    } catch (err) {
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export default publicFetch;
