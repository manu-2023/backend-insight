import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { callDeepseekAI } from '../services/aiService.js';
dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
})

const modifyInsights = async (req, res) => {
    try {
        const { newPrompt } = req.body;

        if (!newPrompt || newPrompt.trim() === '') {
            return res.status(400).json({ error: 'New prompt is required' });
        }
        const [rows] = await pool.query(
            `SELECT * FROM ${process.env.DB_INSIGHT_TABLE_NAME} ORDER BY created_at DESC LIMIT 1`
        );
        if (rows.length <= 0) {
            return res.status(404).json({ message: 'No insights found !!' });
        }
        const latestInsight = rows[0];
        const modifiedPrompt = `${latestInsight.insight}\n\n${newPrompt}`;

        const modifiedInsight = await callDeepseekAI(modifiedPrompt);
        if (!modifiedInsight || !modifiedInsight.trim()) {
            return res.status(500).json({ error: 'AI did not return any modified insight' });
        }
            await pool.query(
                `UPDATE ${process.env.DB_INSIGHT_TABLE_NAME} SET insight = ?, created_at = NOW() WHERE id = ?`,
                [modifiedInsight, rows[0].id]
            );
        res.status(200).json({
            message: 'Insight modified successfully',
            updatedInsight: modifiedInsight,
        });




    
    } catch (err) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
}


export default modifyInsights;