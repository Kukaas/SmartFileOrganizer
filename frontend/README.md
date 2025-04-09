# Smart File Organizer - Chrome Extension

A Chrome extension that helps organize and analyze files using AI.

## Features

- Upload and organize files of all types
- AI-powered analysis and summarization of documents
- Automatic categorization and tagging
- Document preview and export
- Secure cloud storage and sync across devices

## Development

1. Install dependencies:
```
npm install
```

2. Run the development server:
```
npm run dev
```

## Building the Extension

1. Build the extension:
```
npm run build:extension
```

2. Package the extension for Chrome Web Store submission:
```
npm run package:extension
```
This will create a `dist.zip` file in the root directory.

## Chrome Web Store Submission

1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/)

2. Create a developer account if you don't have one (one-time $5.00 registration fee)

3. Click "Add new item" 

4. Upload the `dist.zip` file

5. Fill in the store listing information:
   - Description
   - Screenshots (at least one 1280x800 or 640x400)
   - Promo images (optional)
   - Category (Productivity recommended)
   - Language

6. Set pricing and distribution options

7. Submit for review (can take several business days)

## Required Assets for Chrome Web Store

### Screenshots

- At least one screenshot (1280x800 or 640x400)
- Show the main features of your extension

### Promotional Images (Optional)

- Small promo tile: 440x280
- Large promo tile: 920x680
- Marquee promo tile: 1400x560

### Description

Include a detailed description of your extension's features:
- AI-powered file organization
- Document analysis and summarization
- Automatic categorization and tagging
- Cross-device synchronization
- Privacy and security features

## Updating the Extension

1. Increment the version number in `public/manifest.json`
2. Rebuild and repackage the extension
3. Submit the new zip file as an update on the Chrome Developer Dashboard
