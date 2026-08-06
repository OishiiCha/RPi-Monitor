import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/usr/share/rpimonitor/web',
  build: {
    outDir: '../../../dist/web',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        status: resolve(__dirname, 'src/usr/share/rpimonitor/web/status.html'),
        statistics: resolve(__dirname, 'src/usr/share/rpimonitor/web/statistics.html'),
        addons: resolve(__dirname, 'src/usr/share/rpimonitor/web/addons.html'),
        index: resolve(__dirname, 'src/usr/share/rpimonitor/web/index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/static.json': 'http://localhost:8888',
      '/dynamic.json': 'http://localhost:8888',
      '/version.json': 'http://localhost:8888',
      '/status.json': 'http://localhost:8888',
      '/statistics.json': 'http://localhost:8888',
      '/menu.json': 'http://localhost:8888',
      '/friends.json': 'http://localhost:8888',
      '/page.json': 'http://localhost:8888',
      '/addons.json': 'http://localhost:8888',
      '/all.json': 'http://localhost:8888',
      '/stat': 'http://localhost:8888',
      '/ws': {
        target: 'ws://localhost:8888',
        ws: true,
      },
    },
  },
});
