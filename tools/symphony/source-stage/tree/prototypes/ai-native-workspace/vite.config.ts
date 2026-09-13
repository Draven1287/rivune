import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/postcss';

export default defineConfig({
  base: './',
  plugins: [react()],
  css: { postcss: { plugins: [tailwind()] } },
  server: { host: '127.0.0.1', port: 4317, strictPort: true },
});
