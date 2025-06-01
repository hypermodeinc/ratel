import path from 'path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // server: {
  //   fs: {
  //     strict: false, // Permite servir arquivos fora do root do projeto
  //   },
  // },
  //   root: 'public',
  esbuild: {
    loader: 'jsx',
    include: /.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      buffer: 'safe-buffer',
      '@': path.resolve(__dirname, 'src'),
      components: path.resolve(__dirname, 'src/components'),
      actions: path.resolve(__dirname, 'src/actions'),
      reducers: path.resolve(__dirname, 'src/reducers'),
      lib: path.resolve(__dirname, 'src/lib'),
      containers: path.resolve(__dirname, 'src/containers'),
      assets: path.resolve(__dirname, 'src/assets'),
    },
  },
  css: {
    postcss: {
      map: false,
    },
  },
})
