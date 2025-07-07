import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLatestUploadedFile } from './Excel/fileUploadController.js';
import { handleExcelWorkflow } from '../services/excelService.js';
import { handleSQLWorkflow } from '../services/sqlService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const promptDir = path.join(__dirname, '../prompts');

export const unifiedHandler = async (req, res) => {
    try {
        const { source, filters, prompt, filePath,tableName } = req.body;

        if (!source) return res.status(400).json({ error: 'Source is required' });

        const promptFile = source === 'excel' ? 'chunk_excel_prompt.txt' : 'chunk_sql_prompt.txt';
        const promptPath = path.join(promptDir, promptFile);

        if (prompt && prompt.trim() !== '') {
            fs.writeFileSync(promptPath, prompt, 'utf-8');
        } else {
            if (!fs.existsSync(promptPath)) {
                return res.status(400).json({ error: 'No prompt provided and no existing default prompt found.' });
            }
        }

        if (source === 'excel') {
            let finalFilePath = filePath;
            if (!finalFilePath && source === 'excel') {
                const latest = getLatestUploadedFile();
                if (latest === null) {
                    return res.status(400).json({ message: 'No Excel file found in uploadedFile folder' })
                };
                finalFilePath = path.join(__dirname, '../uploadedFile', latest);
            }
            const finalInsight = await handleExcelWorkflow(filters, finalFilePath);
            return res.json({ message: 'Insight generated' });
        } 
        else if (source === 'sql') {
            if (!tableName || tableName.trim() === '') {
                return res.status(400).json({ error: 'Table name is required for SQL source' });
            }
            const finalSQLInsight = await handleSQLWorkflow(filters,tableName);
            return res.json({ message: 'SQL Insight generated' });


        }
        else {
            return res.status(400).json({ error: 'Unsupported source' });
        }

    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
};
