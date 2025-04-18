# Smart File Organizer

A Chrome extension with backend API that helps organize files using AI-powered analysis. The system uses Google's Gemini API and Hugging Face for intelligent file analysis and categorization.

## Features

- File synchronization between Chrome extension and server
- AI-powered file analysis using Gemini and Hugging Face
- Content-based file categorization
- Secure file storage with encryption
- Support for various file types including images, PDFs, and documents

## Project Structure

```
SmartFileOrganizer/
├── backend/         # Node.js backend API
├── extension/       # Chrome extension source
└── README.md       # This file
```

## Prerequisites

- Node.js 16 or higher
- MongoDB database
- Google Cloud account for Gemini API
- Hugging Face account
- Chrome browser for extension

## Setup Instructions

### 1. Backend Setup

1. Navigate to backend directory:
```bash
cd backend
npm install
```

2. Create `.env` file:
```env
PORT=3000
MONGODB_URI=your_mongodb_connection_string
ENCRYPTION_KEY=your_secure_encryption_key
HUGGINGFACE_API_KEY=your_huggingface_api_key
GEMINI_API_KEY=your_gemini_api_key
```

3. Start development server:
```bash
npm run dev
```

### 2. Gemini API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Gemini API
4. Create API credentials
5. Copy the API key to your `.env` file

Key Configuration:
- Model: gemini-2.0-flash
- Supports: Text and vision analysis
- Request limit: Check your quota in Google Cloud Console

### 3. Hugging Face Setup

1. Create account at [Hugging Face](https://huggingface.co)
2. Go to Settings → Access Tokens
3. Create new token with read access
4. Copy token to your `.env` file as HUGGINGFACE_API_KEY

Used Models:
- Text classification: facebook/bart-large-mnli
- Image classification: google/vit-base-patch16-224

### 4. Vercel Deployment

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from backend directory:
```bash
cd backend
vercel
```

4. Configure environment variables in Vercel:
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env` file
   - Make sure to add:
     - `MONGODB_URI`
     - `ENCRYPTION_KEY`
     - `HUGGINGFACE_API_KEY`
     - `GEMINI_API_KEY`

5. Deploy to production:
```bash
vercel --prod
```

6. Create new file .env.production and run. After building refresh the extention in you browser
```bash
npm run build:extension
```

### 5. Extension Setup

1. Navigate to extension directory:
```bash
cd frontend
npm install
npm run build:extension
```

2. Load in Chrome:
   - Open Chrome → Extensions → Enable Developer mode
   - Click "Load unpacked"
   - Select the extension's `dist` directory

## API Documentation

Full API documentation available in `/backend/README.md`

Key endpoints:
- `POST /api/files/sync` - Sync files
- `POST /api/files/:fileId/analyze` - AI analysis
- `GET /api/files/:fileId/analysis` - Get analysis results

## Security Notes

- All file content is encrypted before storage
- API requests limited to 100MB
- Requires device authentication
- API keys should never be exposed in frontend code

## Limitations

- Image analysis limited to common formats
- PDF/Document analysis may be limited for binary content
- API rate limits apply for both Gemini and Hugging Face

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## License

MIT License - See LICENSE file for details

# Author

CHESTER LUKE MALIGASO
