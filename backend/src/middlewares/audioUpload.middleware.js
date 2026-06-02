const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// Ensure upload directory exists at module load time
const uploadDir = path.join(__dirname, '../../uploads/audio');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const ext      = path.extname(file.originalname) || '.webm';
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
        cb(null, filename);
    },
});

const audioUpload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024, // 15 MB — within Gemini inline_data limit
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are accepted. Received: ' + file.mimetype), false);
        }
    },
});

module.exports = audioUpload;
