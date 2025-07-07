import path from 'path';
import multer from 'multer';
import fs from 'fs';
import { exec } from 'child_process';

const uploadDir = './uploadedFile';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 🔧 Storage config (adds timestamp to file name)
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    console.log('Uploading')
    cb(null, `${timestamp}-${base}${ext}`);
  }
});

const upload = multer({ storage }).single('excel');

export function getLatestUploadedFile() {
  const files = fs.readdirSync(uploadDir)
    .map(file => ({
      name: file,
      time: fs.statSync(path.join(uploadDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  return files.length ? files[0].name : null;
}

export const FileUploadController = (req, res) => {
  console.log('⏳ Starting upload process...'); // Debug 1

  upload(req, res, (err) => {
    if (err) {
      console.error('❌ Multer upload error:', err.message); // Debug 2
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    if (!req.file) {
      console.error('❌ No file received in request'); // Debug 3
      console.log('Request files:', req.files); // Debug 4
      console.log('Request body:', req.body); // Debug 5
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('✅ File received:', req.file.filename); // Debug 6

    const uploadedFileName = req.file.filename;
    const filePath = path.join(uploadDir, uploadedFileName);
    const shouldDeletePrevious = req.body.deletePrevious === 'true';

    console.log(`🗑️ Delete previous files? ${shouldDeletePrevious}`); // Debug 7

    if (shouldDeletePrevious) {
      try {
        const files = fs.readdirSync(uploadDir);
        console.log(`Found ${files.length} files in upload directory`); // Debug 8

        for (const file of files) {
          if (file !== uploadedFileName) {
            console.log(`Deleting: ${file}`); // Debug 9
            fs.unlinkSync(path.join(uploadDir, file));
          }
        }
        console.log('✅ Previous files deleted'); // Debug 10
      } catch (deleteErr) {
        console.error('❌ File deletion error:', deleteErr); // Debug 11
        return res.status(500).json({ error: 'Deletion failed', details: deleteErr.message });
      }
    }

    console.log('🐍 Running Python script...'); // Debug 12
    const pythonScript = 'scripts/headerExtracter.py';
    const cmd = `python3 ${pythonScript} "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Python script failed!'); // Debug 13
        console.error('STDERR:', stderr); // Debug 14
        console.error('Error object:', error); // Debug 15
        return res.status(500).json({
          error: 'Python header extraction failed',
          details: stderr || error.message
        });
      }

      console.log('Python output:', stdout); // Debug 16

      try {
        const jsonData = JSON.parse(stdout); // 🔁 stdout contains the JSON result
        console.log('✅ Successfully parsed headers from Python output');

        return res.json({
          message: '✅ File uploaded successfully',
          filePath: `/uploadedFile/${uploadedFileName}`,
          latestUploaded: uploadedFileName,
          ...jsonData
        });
      } catch (parseErr) {
        console.error('❌ Failed to parse Python stdout:', parseErr.message);
        return res.status(500).json({ error: 'Failed to parse Python output', details: parseErr.message });
      }
    })
  });
};