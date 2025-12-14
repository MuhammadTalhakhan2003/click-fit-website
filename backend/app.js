const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
}


const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function(req, file, cb) {
        
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'image-' + uniqueSuffix + ext);
    }
});


const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
    }
};

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});


app.get('/', (req, res) => {
    res.json({
        message: 'Click Fit Backend API',
        endpoints: {
            upload: 'POST /upload',
            images: 'GET /images',
            health: 'GET /health'
        },
        status: 'running'
    });
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uploadDir: uploadDir
    });
});

app.post('/upload', upload.array('images', 10), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }
        
        const uploadedFiles = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            path: `/uploads/${file.filename}`
        }));
        
        console.log(`Uploaded ${uploadedFiles.length} file(s):`, uploadedFiles.map(f => f.filename));
        
        res.json({
            success: true,
            message: `Successfully uploaded ${uploadedFiles.length} image(s)`,
            uploadedCount: uploadedFiles.length,
            images: uploadedFiles.map(f => f.filename)
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Error uploading files'
        });
    }
});

app.get('/images', (req, res) => {
    try {
        fs.readdir(uploadDir, (err, files) => {
            if (err) {
                return res.status(500).json({
                    success: false,
                    message: 'Error reading upload directory'
                });
            }
            
            const images = files
                .filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file))
                .map(file => ({
                    filename: file,
                    url: `/uploads/${file}`,
                    path: path.join(uploadDir, file)
                }));
            
            res.json({
                success: true,
                count: images.length,
                images: images
            });
        });
    } catch (error) {
        console.error('Error getting images:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving images'
        });
    }
});

app.use('/uploads', express.static(uploadDir));

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.url} not found`
    });
});

app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File size too large. Maximum size is 5MB.'
            });
        }
        
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    
    res.status(500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});


app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════╗
║          Click Fit Backend Server Running            ║
╠══════════════════════════════════════════════════════╣
║  🌐 Server: http://localhost:${PORT}                ║ 
║  📁 Upload Directory: ${uploadDir}                  ║
║  📊 Endpoints:                                      ║
║     • GET  /          - API information              ║
║     • GET  /health    - Health check                 ║
║     • POST /upload    - Upload images                ║
║     • GET  /images    - List uploaded images         ║
║     • GET  /uploads/* - Access uploaded files        ║
╚══════════════════════════════════════════════════════╝
    `);
});

module.exports = app;