import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { spawn } from 'child_process';
import mysql from 'mysql2/promise';
import { Together } from 'together-ai';
import pLimit from 'p-limit';
import { callOpenAI } from './aiService.js';
import { response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const together = new Together();
const limit = pLimit(5);
const MAX_CHARS = 200000;
const immediateFolder = path.join(__dirname, '../immediate_insights');

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
    const promptPath = path.join(__dirname, '../prompts', 'chunk_excel_prompt.txt');

    let promptText = '';
    try {
        promptText = fs.readFileSync(promptPath, 'utf-8').trim();
    } catch (err) {
        console.error(`⚠️ Failed to read prompt file: ${err.message}`);
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

async function runExcelPython(filters, filePath) {
    return new Promise((resolve, reject) => {
        const pyScriptPath = path.join(__dirname, '../scripts/filter.py').replace(/\\/g, '/');
        const filtersJSON = JSON.stringify({ ...filters, filePath });
        console.log(`🐍 Running Python with spawn:`);

        const process = spawn('python', [pyScriptPath, filtersJSON]);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                console.error("Python stderr:", stderr);
                return reject('Python script failed');
            }

            try {
                const data = JSON.parse(stdout.trim());
                console.log('Filtered data', data);
                if (data.error) return reject(data.error);
                resolve(data);
            } catch (err) {
                console.error("Parsing error:", err.message);
                reject('Failed to parse filtered data');
            }
        });
    });
}
async function saveFinalInsightToDB(sourceType, filters, finalInsight) {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    // Convert current time to IST
    const nowIST = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
    const istDate = new Date(nowIST);

    // Insert including created_at
    let table_name = process.env.DB_INSIGHT_TABLE_NAME ;
      await connection.execute(
        `INSERT INTO ${table_name} (source_type, filters, insight, donar_name, created_at, privacy) VALUES (?, ?, ?, ?, ?, ?)`,
        [sourceType, JSON.stringify(filters), finalInsight, "", istDate, 'private']
    );

    await connection.end();
}

function getLatestUploadedFile() {
    console.log('📁 Checking upload folder:', uploadDir);
    const uploadDir = path.join(__dirname, '../uploadedFile');

    if (!fs.existsSync(uploadDir)) {
        console.log('❌ Folder does not exist');
        throw new Error('📂 Upload folder does not exist');
    }

    const files = fs.readdirSync(uploadDir);
    console.log('📄 All files found:', files);

    const validFiles = files.filter(f => f.endsWith('.xlsx') || f.endsWith('.csv'));
    console.log('✅ Valid Excel/CSV files:', validFiles);

    if (validFiles.length === 0) {
        throw new Error('❌ No uploaded Excel/CSV files found');
    }

    const sorted = validFiles
        .map(name => ({ name, time: fs.statSync(path.join(uploadDir, name)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

    return path.join(uploadDir, sorted[0].name);
}



export async function handleExcelWorkflow(filters, filePath) {
    const actualFilePath = filePath || getLatestUploadedFile();
    const data = await runExcelPython(filters, actualFilePath);
    console.log(`📊 Filtered data rows: ${data.length}`);

    const chunks = splitChunks(data);
    console.log(`📦 Total chunks to process: ${chunks.length}`);

    deleteImmediateInsightFiles();
    const failedChunks = [];
    let successCount = 0;

    let chunkPromptTemplate;
    try {
        chunkPromptTemplate = loadPromptTemplate('chunk_excel_prompt.txt');
    } catch (err) {
        console.error('❌ Prompt file not found:', err.message);
        throw new Error('Prompt template missing');
    }

    const tasks = chunks.map((chunk, index) =>
        limit(async () => {
            if (!chunk || chunk.length === 0) {
                console.warn(`⚠️ Skipping empty chunk ${index + 1}`);
                return;
            }

            const chunkData = JSON.stringify(chunk);
            const prompt = chunkPromptTemplate.includes('{{data}}')
                ? chunkPromptTemplate.replace('{{data}}', chunkData)
                : `${chunkPromptTemplate}\n\n${chunkData}`;

            try {
                const insight = await callOpenAI(prompt);
                if (!insight || insight.trim() === '') {
                    console.warn(`⚠️ Empty insight returned for chunk ${index + 1}`);
                    failedChunks.push({ chunk, index });
                    return;
                }

                saveImmediateInsight(index, insight, prompt);
                successCount++;
                console.log(`✅ Insight saved for chunk ${index + 1}`);
            } catch (err) {
                console.error(`❌ Chunk ${index + 1} failed:`, err.message);
                failedChunks.push({ chunk, index });
            }
        })
    );

    await Promise.all(tasks);

    for (const { chunk, index } of failedChunks) {
        try {
            const chunkData = JSON.stringify(chunk);
            console.log(JSON.stringify(chunk, null, 2));
            const prompt = chunkPromptTemplate.includes('{{data}}')
                ? chunkPromptTemplate.replace('{{data}}', chunkData)
                : `${chunkPromptTemplate}\n\n${chunkData}`;

            const retryInsight = await callOpenAI(prompt);

            if (!retryInsight || retryInsight.trim() === '') {
                console.warn(`⚠️ Still no insight for chunk ${index + 1} after retry`);
                continue;
            }

            saveImmediateInsight(index, retryInsight, prompt);
            successCount++;
            console.log(`✅ Retry success for chunk ${index + 1}`);
        } catch (err) {
            console.error(`❌ Final failure for chunk ${index + 1}:`, err.message);
        }
    }

    if (successCount === 0) throw new Error('No valid chunk insights generated');

    const combinedText = readStructuredImmediateInsights();
    if (!combinedText || combinedText.trim() === '') throw new Error('Failed to get AI insight');

    if (chunks.length === 1) {
        const onlyFile = fs.readdirSync(immediateFolder)[0];
        const raw = fs.readFileSync(path.join(immediateFolder, onlyFile), 'utf-8');

        const insightOnly = raw
            .split('🔹 Chunk 1 Insight:')[1]?.trim()
            || raw.trim();

        deleteImmediateInsightFiles();

        await saveFinalInsightToDB('excel', filters, insightOnly);
        return insightOnly;
    }

    const finalPromptTemplate = loadPromptTemplate('final_prompt.txt');

    const finalPrompt = finalPromptTemplate.includes('{{data}}')
        ? finalPromptTemplate.replace('{{data}}', combinedText)
        : `${finalPromptTemplate}\n\n${combinedText}`;
    console.log('Generrating final insight with prompt:', finalPrompt);

    let finalInsight;
    try {
        finalInsight = await callOpenAI(finalPrompt);
        if (!finalInsight || finalInsight.trim() === '') {
            throw new Error('Empty response from AI for final insight');
        }
    } catch (err) {
        console.error('❌ Final AI call failed:', err.message);
        throw new Error('Failed to generate final insight: ' + err.message);
    }

    deleteImmediateInsightFiles();

    await saveFinalInsightToDB('excel', filters, finalInsight);
    return finalInsight;
}
