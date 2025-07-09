import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pLimit from 'p-limit';
import { callDeepseekAI } from './aiService.js';


dotenv.config();
const limit = pLimit(5);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MAX_CHARS = 200000;
const immediateFolder = path.join(__dirname, '../immediate_insights');

async function saveFinalInsightToDB(sourceType, filters, finalInsight) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(nowIST);

    const tableName = process.env.DB_INSIGHT_TABLE_NAME;

    await connection.execute(
        `INSERT INTO ${tableName} (source_type, filters, insight, donar_name, created_at, privacy) VALUES (?, ?, ?, ?, ?, ?)`,
        [sourceType, JSON.stringify(filters), finalInsight, "", istDate, 'private']
    );


    await connection.end();
}


function splitChunks(data, maxChars = MAX_CHARS) {
    const chunks = [];
    let currentChunk = [];
    let currentLength = 0;

    for (const item of data) {
        const itemStr = JSON.stringify(item);
        if (currentLength + itemStr.length > maxChars) {
            chunks.push(currentChunk);
            currentChunk = [];
            currentLength = 0;
        }
        currentChunk.push(item);
        currentLength += itemStr.length;
    }

    if (currentChunk.length > 0) chunks.push(currentChunk);
    return chunks;
}

function deleteImmediateInsightFiles() {
    if (!fs.existsSync(immediateFolder)) return;
    fs.readdirSync(immediateFolder).forEach(file =>
        fs.unlinkSync(path.join(immediateFolder, file))
    );
}

function saveImmediateInsight(index, insight) {
    if (!fs.existsSync(immediateFolder)) fs.mkdirSync(immediateFolder);

    const filePath = path.join(immediateFolder, `chunk_${index + 1}.txt`);
    const promptPath = path.join(__dirname, '../prompts', 'chunk_sql_prompt.txt');

    let promptText = '';
    try {
        promptText = fs.readFileSync(promptPath, 'utf-8').trim();
    } catch (err) {
        throw new Error(`Prompt file "${promptPath}" not found: ${err.message}`);
    }

    const fullText = `🔹 Chunk ${index + 1} Prompt Used:\n${promptText}\n\n🔹 Chunk ${index + 1} Insight:\n${insight.trim()}`;

    fs.writeFileSync(filePath, fullText, 'utf-8');
}

function readStructuredImmediateInsights() {
    if (!fs.existsSync(immediateFolder)) return '';
    const files = fs.readdirSync(immediateFolder).sort();
    if (files.length === 0) return '';

    let combined = '';
    files.forEach((file, i) => {
        const content = fs.readFileSync(path.join(immediateFolder, file), 'utf-8').trim();
        if (content) {
            combined += `### Chunk ${i + 1} Insight:\n${content}\n\n`;
        }
    });
    return combined.trim();
}

function loadPromptTemplate(filename) {
    const promptPath = path.join(__dirname, '../prompts', filename);
    if (!fs.existsSync(promptPath)) throw new Error(`Prompt file "${filename}" not found`);
    return fs.readFileSync(promptPath, 'utf-8');
}







export async function handleSQLWorkflow(filters, tableName) {
    if (!tableName) return res.status(400).json({ error: 'Table name is required' });

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    let query = `SELECT * FROM \`${tableName}\``;
    const values = [];

    if (filters && Object.keys(filters).length > 0) {
        const conditions = [];
        for (const [key, value] of Object.entries(filters)) {
            if (value !== undefined && value !== '') {
                conditions.push(`\`${key}\` = ?`);
                values.push(value);
            }
        }
        if (conditions.length > 0) query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [rows] = await connection.execute(query, values);
    await connection.end();

    if (!rows || rows.length === 0) {
        throw new Error('No data found for the given filters');
    }


    const chunks = splitChunks(rows);
    deleteImmediateInsightFiles();
    const failedChunks = [];
    let successCount = 0;

    let chunkPromptTemplate;
    try {
        chunkPromptTemplate = loadPromptTemplate('chunk_sql_prompt.txt');
    } catch (err) {
        throw new Error('Prompt template missing');
    }

    const tasks = chunks.map((chunk, index) =>
        limit(async () => {
            if (!chunk || chunk.length === 0) {
                return;
            }

            const chunkData = JSON.stringify(chunk);
            const prompt = chunkPromptTemplate.includes('{{data}}')
                ? chunkPromptTemplate.replace('{{data}}', chunkData)
                : `${chunkPromptTemplate}\n\n${chunkData}`;

            try {
                const insight = await callDeepseekAI(prompt);
                if (!insight || insight.trim() === '') {
                    failedChunks.push({ chunk, index });
                    return;
                }

                saveImmediateInsight(index, insight, prompt);
                successCount++;
            } catch (err) {
                failedChunks.push({ chunk, index });
            }
        })
    );

    await Promise.all(tasks);

    for (const { chunk, index } of failedChunks) {
        try {
            const chunkData = JSON.stringify(chunk);
            const prompt = chunkPromptTemplate.includes('{{data}}')
                ? chunkPromptTemplate.replace('{{data}}', chunkData)
                : `${chunkPromptTemplate}\n\n${chunkData}`;

            const retryInsight = await callDeepseekAI(prompt);
            if (!retryInsight || retryInsight.trim() === '') {
                continue;
            }

            saveImmediateInsight(index, retryInsight, prompt);
            successCount++;
        } catch (err) {
        }
    }

    if (successCount === 0) throw new Error('No valid SQL chunk insights generated');

    const combinedText = readStructuredImmediateInsights();
    if (!combinedText || combinedText.trim() === '') throw new Error('Failed to get AI insight from SQL data');

    let finalInsight;

    if (chunks.length === 1) {
        const onlyFile = fs.readdirSync(immediateFolder)[0];
        const raw = fs.readFileSync(path.join(immediateFolder, onlyFile), 'utf-8');

        const insightOnly = raw
            .split('🔹 Chunk 1 Insight:')[1]?.trim()
            || raw.trim();

        deleteImmediateInsightFiles();

        await saveFinalInsightToDB('sql', filters, insightOnly);
        return insightOnly;
    }

    const finalPromptTemplate = loadPromptTemplate('final_prompt.txt');
    const finalPrompt = finalPromptTemplate.includes('{{data}}')
        ? finalPromptTemplate.replace('{{data}}', combinedText)
        : `${finalPromptTemplate}\n\n${combinedText}`;

    try {
        finalInsight = await callDeepseekAI(finalPrompt);
        if (!finalInsight || finalInsight.trim() === '') {
            throw new Error('Empty response from AI for final SQL insight');
        }
    } catch (err) {
        throw new Error('Failed to generate final SQL insight: ' + err.message);
    }
    deleteImmediateInsightFiles();
    await saveFinalInsightToDB('sql', filters, finalInsight);
    return finalInsight;
}
