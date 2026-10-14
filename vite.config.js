import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { geminiApiPlugin } from './vite-plugin-gemini-api.js';

export default defineConfig({
  plugins: [react(), geminiApiPlugin()],
  root: '.',
  server: {
    open: true,
  },
});

