import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    root: '.', // La racine est le dossier où se trouve vite.config.js (client/)
    publicDir: 'public',
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:4000', // Proxy API vers le backend
                changeOrigin: true
            }
        }
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    }
});
