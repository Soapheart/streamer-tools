import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'), // ✅ Точка входа
      formats: ["es"],
      fileName: 'main',
    },
    rollupOptions: {
      external: [
        'electron',
        'express',
        'cors',
        'ws',
        'http',
        'https',
        'path',
        'url',
        'fs',
        'stream',
        'buffer',
        'crypto',
        'electron-store',
        /^node:.*/, // Все node:* модули
      ],
    },
    minify: false, // Отключаем для дев-режима (быстрее ребилд)
    sourcemap: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // Опционально, если используете алиасы
    },
  },
});