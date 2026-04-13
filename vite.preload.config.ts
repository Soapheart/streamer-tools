import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    outDir: '.vite/build',
    lib: {
      entry: path.resolve(__dirname, 'src/preload.ts'), // ✅ Убедитесь, что файл существует
      formats: ['cjs'],
      fileName: 'preload',
    },
    rollupOptions: {
      external: [
        'electron',
        /^node:.*/,
      ],
    },
    minify: false,
    sourcemap: true,
  },
});