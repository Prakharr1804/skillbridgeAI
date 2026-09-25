const multer = require('multer');

// Store audio in memory buffer for immediate AI transcription without persisting to disk
const storage = multer.memoryStorage();

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

