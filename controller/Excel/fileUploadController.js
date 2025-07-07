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

  upload(req, res, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Upload failed', details: err.message });
    }

    if (!req.file) {
      
      return res.status(400).json({ error: 'No file uploaded' });
    }


    const uploadedFileName = req.file.filename;
    const filePath = path.join(uploadDir, uploadedFileName);
    const shouldDeletePrevious = req.body.deletePrevious === 'true';


    if (shouldDeletePrevious) {
      try {
        const files = fs.readdirSync(uploadDir);

        for (const file of files) {
          if (file !== uploadedFileName) {
            fs.unlinkSync(path.join(uploadDir, file));
          }
        }
      } catch (deleteErr) {
        return res.status(500).json({ error: 'Deletion failed', details: deleteErr.message });
      }
    }

    const pythonScript = 'scripts/headerExtracter.py';
    const cmd = `python3 ${pythonScript} "${filePath}"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({
          error: 'Python header extraction failed',
          details: stderr || error.message
        });
      }


      try {
        const jsonData = JSON.parse(stdout); // 🔁 stdout contains the JSON result

        return res.json({
          message: '✅ File uploaded successfully',
          filePath: `/uploadedFile/${uploadedFileName}`,
          latestUploaded: uploadedFileName,
          ...jsonData
        });
      } catch (parseErr) {
        return res.status(500).json({ error: 'Failed to parse Python output', details: parseErr.message });
      }
    })
  });
};