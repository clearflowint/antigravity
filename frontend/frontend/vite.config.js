import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { spawn } from 'child_process';

let fastApiProcess = null;

const fastApiRunnerPlugin = () => ({
  name: 'fastapi-runner-plugin',
  configureServer() {
    if (!fastApiProcess) {
      const scriptPath = path.resolve(__dirname, '../backend/main.py');
      try {
        fastApiProcess = spawn('python3', [scriptPath], {
          stdio: 'inherit',
          env: { ...process.env, FASTAPI_PORT: '8001' }
        });
        fastApiProcess.on('exit', (code) => {
          console.log(`[FastAPI Dev Runner] Exited with code ${code}`);
          fastApiProcess = null;
        });
        fastApiProcess.on('error', (err) => {
          console.warn('[FastAPI Dev Runner Error]:', err);
        });
      } catch (err) {
        console.warn('[FastAPI Spawn Catch]:', err);
      }
    }
  }
});

const authCallbackPlugin = () => ({
  name: 'auth-callback-middleware',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url && (req.url.startsWith('/auth/callback') || req.url.startsWith('/auth/callback/'))) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=UTF-8');
        res.end(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Google Auth Callback</title></head>
<body style="background:#0F172A;color:#F8FAFC;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;padding:20px;">
    <p style="font-size:14px;color:#94A3B8;">Authentication received. Returning to ClearFlow...</p>
  </div>
  <script>
    try {
      var hash = window.location.hash ? window.location.hash.substring(1) : '';
      var search = window.location.search ? window.location.search.substring(1) : '';
      var params = new URLSearchParams(hash || search);
      var idToken = params.get('id_token');
      var accessToken = params.get('access_token');
      var code = params.get('code');
      var payload = { id_token: idToken, credential: idToken, access_token: accessToken, code: code };

      if (window.opener && window.opener !== window) {
        window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', payload: payload }, '*');
        setTimeout(function() { window.close(); }, 300);
      } else {
        window.location.href = '/login' + window.location.hash;
      }
    } catch (e) {
      console.error(e);
      window.location.href = '/login';
    }
  </script>
</body>
</html>`);
      } else {
        next();
      }
    });
  }
});

export default defineConfig({
  root: path.resolve(__dirname, '.'),
  plugins: [
    vue(),
    fastApiRunnerPlugin(),
    authCallbackPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ClearFlow Small Chits',
        short_name: 'ClearFlow',
        description: 'Chit Fund 20-Month Workflow Automation',
        theme_color: '#0F172A',
        background_color: '#0F172A',
        display: 'standalone'
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../dist'),
    emptyOutDir: true
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false
      }
    }
  }
});

