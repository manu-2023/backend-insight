import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

// Required to resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getSelectedColumns = (req, res) => {
  const { filePath, headers } = req.body;

  if (!filePath || !headers || !Array.isArray(headers) || headers.length === 0) {
    return res.status(400).json({ error: 'File path and at least one header are required.' });
  }

  // 🔧 Normalize relative path
  console.log("received path", filePath)
  const cleanedPath = filePath.replace(/^\/+/, ''); // remove leading slashes
  const absolutePath = path.resolve(__dirname, '..', '..', cleanedPath);
  console.log('✅ Final resolved path:', absolutePath);



  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ File not found: ${absolutePath}`);
    return res.status(404).json({ error: 'Uploaded file not found. Please re-upload.' });
  }

  const pythonScript = path.join(__dirname, '..','..', 'scripts', 'getColumns.py');
  const headerArgs = headers.map(h => `"${h}"`).join(' ');
  const cmd = `python3 "${pythonScript}" "${absolutePath}" ${headerArgs}`;

  exec(cmd, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Python script error:', error.message);
      return res.status(500).json({ error: 'Python script failed to extract column data.' });
    }

    try {
      const values = JSON.parse(stdout);
      return res.json(values);
    } catch (parseErr) {
      console.error('❌ JSON parse error from Python stdout:', parseErr.message);
      console.error('🔍 Raw stdout:', stdout);
      return res.status(500).json({ error: 'Failed to parse Python output.' });
    }
  });
};
