import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        background: path.resolve(__dirname, 'src/background.js'),
        content: path.resolve(__dirname, 'src/content.js'),
      },
      output: {
        entryFileNames: '[name].js',
      },
    },
    // Don't minify for troubleshooting
    minify: process.env.NODE_ENV === 'production',
    // Copy the manifest and other assets to the dist folder
    copyPublicDir: true,
  },
  // Ensure sourcemaps are generated for debugging
  sourcemap: true,
});
