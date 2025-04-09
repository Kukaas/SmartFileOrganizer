# Smart File Organizer - Backend API

This is the backend API for the Smart File Organizer Chrome extension. It provides file storage, synchronization, and AI-powered file analysis features.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file with the following variables:
```
PORT=3000
MONGODB_URI=your_mongodb_connection_string
ENCRYPTION_KEY=your_encryption_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
GEMINI_API_KEY=your_gemini_api_key
```

3. Run the development server:
```
npm run dev
```

## Deploying to Vercel

1. Install Vercel CLI:
```
npm install -g vercel
```

2. Login to Vercel:
```
vercel login
```

3. Deploy to Vercel:
```
vercel
```

4. During deployment, you'll be prompted to set up environment variables. Make sure to add:
   - `MONGODB_URI`
   - `ENCRYPTION_KEY`
   - `HUGGINGFACE_API_KEY`
   - `GEMINI_API_KEY`

5. For production deployment:
```
vercel --prod
```

## API Endpoints

- `GET /api/files` - Get all files for a device
- `POST /api/files/sync` - Sync files with the server
- `PATCH /api/files/:fileId` - Update a file
- `DELETE /api/files/:fileId` - Delete a file
- `GET /api/files/:fileId/download` - Download file content
- `POST /api/files/:fileId/analyze` - Analyze a file with AI
- `GET /api/files/:fileId/analysis` - Get file analysis results
- `GET /api/device/info` - Get device information

## MongoDB Models

- `Device` - Stores device information
- `File` - Stores file metadata and content

## Notes

- The API requires a device ID header (`X-Device-ID`) for all requests
- File content is encrypted before storage
- API requests are limited to 100MB payload size 