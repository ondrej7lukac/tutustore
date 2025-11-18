# TUTU Shop Backend

## Installation

1. Install Node.js (if not already installed): https://nodejs.org/

2. Install dependencies:
```bash
npm install
```

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000`

## API Endpoints

### Products

- `GET /api/products/:category` - Get all products for a category (e.g., `/api/products/coffee`, `/api/products/music`)
- `GET /api/products/:category/:id` - Get single product
- `POST /api/products/:category` - Create new product
- `PUT /api/products/:category/:id` - Update product
- `DELETE /api/products/:category/:id` - Delete product

### File Uploads

- `POST /api/upload/image` - Upload image file (multipart/form-data, field name: `image`)
- `POST /api/upload/audio` - Upload audio file (multipart/form-data, field name: `audio`)

### Health Check

- `GET /api/health` - Check if server is running

## Data Storage

- Products are stored in JSON files in the `data/` directory
- Uploaded images go to `uploads/images/`
- Uploaded audio files go to `uploads/audio/`

## File Limits

- Images: 10MB max
- Audio: 50MB max


