import multer from 'multer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../public/uploads/organizations');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Memory storage to process with Sharp before saving
const storage = multer.memoryStorage();

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// Middleware for processing image
export const processImage = (fieldName) => {
    return (req, res, next) => {
        // Multer middleware
        const uploadSingle = upload.single(fieldName);

        uploadSingle(req, res, async (err) => {
            if (err) {
                return res.status(400).json({
                    message: 'validators.image.uploadError',
                    error: err.message
                });
            }

            // If no file, proceed (unless required, which logic updates should handle)
            if (!req.file) {
                return next();
            }

            try {
                const filename = `org-${Date.now()}-${Math.round(Math.random() * 1E9)}.webp`;
                const filepath = path.join(uploadDir, filename);
                const publicPath = `/uploads/organizations/${filename}`;

                await sharp(req.file.buffer)
                    .webp({ quality: 80 })
                    .toFile(filepath);

                // Si data viene como string (JSON), parsearlo
                if (req.body.data && typeof req.body.data === 'string') {
                    try {
                        req.body.data = JSON.parse(req.body.data);
                    } catch (e) {
                        req.body.data = {};
                    }
                }

                if (!req.body.data || typeof req.body.data !== 'object') {
                    req.body.data = {};
                }

                req.body.data.image = publicPath;

                next();
            } catch (processingError) {
                return res.status(500).json({
                    message: 'validators.image.processingError',
                    error: processingError.message
                });
            }
        });
    };
};
