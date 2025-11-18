const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve static files (HTML, CSS, images, etc.) from the root directory
app.use(express.static(__dirname));

// Serve the main HTML file at root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'tutushop.html'));
});

// Ensure data and uploads directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
const uploadsImagesDir = path.join(uploadsDir, 'images');
const uploadsAudioDir = path.join(uploadsDir, 'audio');

async function ensureDirectories() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.mkdir(uploadsImagesDir, { recursive: true });
    await fs.mkdir(uploadsAudioDir, { recursive: true });
}

ensureDirectories();

// Configure multer for file uploads
const imageStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsImagesDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const audioStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsAudioDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const imageUpload = multer({ 
    storage: imageStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for images
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

const audioUpload = multer({ 
    storage: audioStorage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for audio
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed!'), false);
        }
    }
});

// Helper function to get products file path
function getProductsFilePath(category) {
    return path.join(dataDir, `products_${category}.json`);
}

// Helper function to load products
async function loadProducts(category) {
    try {
        const filePath = getProductsFilePath(category);
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            // File doesn't exist, return empty array
            return [];
        }
        throw error;
    }
}

// Helper function to save products
async function saveProducts(category, products) {
    const filePath = getProductsFilePath(category);
    await fs.writeFile(filePath, JSON.stringify(products, null, 2), 'utf8');
}

// Get all products for a category
app.get('/api/products/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const products = await loadProducts(category);
        res.json(products);
    } catch (error) {
        console.error('Error loading products:', error);
        res.status(500).json({ error: 'Failed to load products' });
    }
});

// Get single product
app.get('/api/products/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const products = await loadProducts(category);
        const product = products.find(p => p.id === parseInt(id));
        
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error loading product:', error);
        res.status(500).json({ error: 'Failed to load product' });
    }
});

// Upload image
app.post('/api/upload/image', imageUpload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
    }
    
    const imageUrl = `/uploads/images/${req.file.filename}`;
    res.json({ url: imageUrl, filename: req.file.filename });
});

// Upload audio
app.post('/api/upload/audio', audioUpload.single('audio'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
    }
    
    const audioUrl = `/uploads/audio/${req.file.filename}`;
    res.json({ url: audioUrl, filename: req.file.filename });
});

// Create new product
app.post('/api/products/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const products = await loadProducts(category);
        
        // Generate ID
        const newId = products.length > 0 
            ? Math.max(...products.map(p => p.id || 0)) + 1 
            : 1;
        
        const product = {
            id: newId,
            ...req.body,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        products.push(product);
        await saveProducts(category, products);
        
        res.status(201).json(product);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// Update product
app.put('/api/products/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const products = await loadProducts(category);
        const index = products.findIndex(p => p.id === parseInt(id));
        
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        products[index] = {
            ...products[index],
            ...req.body,
            id: parseInt(id),
            updatedAt: new Date().toISOString()
        };
        
        await saveProducts(category, products);
        res.json(products[index]);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
app.delete('/api/products/:category/:id', async (req, res) => {
    try {
        const { category, id } = req.params;
        const products = await loadProducts(category);
        const index = products.findIndex(p => p.id === parseInt(id));
        
        if (index === -1) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        const product = products[index];
        
        // Delete associated files if they exist
        if (product.image && product.image.startsWith('/uploads/')) {
            try {
                const imagePath = path.join(__dirname, product.image);
                await fs.unlink(imagePath);
            } catch (err) {
                console.error('Error deleting image file:', err);
            }
        }
        
        if (product.audioFile && product.audioFile.startsWith('/uploads/')) {
            try {
                const audioPath = path.join(__dirname, product.audioFile);
                await fs.unlink(audioPath);
            } catch (err) {
                console.error('Error deleting audio file:', err);
            }
        }
        
        products.splice(index, 1);
        await saveProducts(category, products);
        
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'TUTU Shop API is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TUTU Shop Backend Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${dataDir}`);
    console.log(`📤 Uploads directory: ${uploadsDir}`);
});

