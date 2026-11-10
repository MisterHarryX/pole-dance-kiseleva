import type { IncomingMessage, ServerResponse } from 'node:http';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

type Router = { handle: (request: Request, route: string) => Promise<Response> };

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((done, fail) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => done(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}

/**
 * Runs the API (server/router.ts — the same code as the Vercel Function) inside the
 * dev and preview servers, and serves the panel at /admin like vercel.json does.
 */
function api(): Plugin {
  const middleware =
    (load: () => Promise<Router>): Connect.NextHandleFunction =>
    async (req: IncomingMessage, res: ServerResponse, next: Connect.NextFunction) => {
      const url = req.url ?? '/';
      if (/^\/admin\/?(\?|$)/.test(url)) {
        req.url = `/admin.html${url.includes('?') ? url.slice(url.indexOf('?')) : ''}`;
        return next();
      }
      if (!url.startsWith('/api/')) return next();
      try {
        const { handle } = await load();
        const origin = `http://${req.headers.host ?? 'localhost'}`;
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
          if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
        }
        if (!headers.has('x-real-ip') && req.socket.remoteAddress) headers.set('x-real-ip', req.socket.remoteAddress);
        const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
        const request = new Request(origin + url, { method: req.method, headers, body: hasBody ? new Uint8Array(await readBody(req)) : undefined });
        const response = await handle(request, new URL(origin + url).pathname.replace(/^\/api\//, ''));
        res.statusCode = response.status;
        response.headers.forEach((value, key) => key !== 'set-cookie' && res.setHeader(key, value));
        const cookies = response.headers.getSetCookie();
        if (cookies.length) res.setHeader('Set-Cookie', cookies);
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (cause) {
        next(cause);
      }
    };

  return {
    name: 'pdk-api',
    config(_config, { mode }) {
      // Server code reads process.env; values already set in the shell win over .env files.
      for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) process.env[key] ??= value;
    },
    configureServer(server) {
      server.middlewares.use(middleware(() => server.ssrLoadModule('/server/router.ts') as Promise<Router>));
    },
    configurePreviewServer(server) {
      let loader: Promise<Router> | null = null;
      const load = () =>
        (loader ??= import('vite')
          .then(({ createServer }) => createServer({ configFile: false, appType: 'custom', server: { middlewareMode: true, hmr: false } }))
          .then((vite) => vite.ssrLoadModule('/server/router.ts') as Promise<Router>));
      server.middlewares.use(middleware(load));
    },
  };
}

// `--mode pages` builds the static copy for GitHub Pages: the site only — the panel and the API stay on Vercel.
export default defineConfig(({ mode }) => ({
  plugins: [react(), api()],
  server: { port: 5180, strictPort: true, host: '127.0.0.1' },
  build: {
    rollupOptions: {
      input: (mode === 'pages'
          ? { main: resolve(import.meta.dirname, 'index.html') }
          : { main: resolve(import.meta.dirname, 'index.html'), admin: resolve(import.meta.dirname, 'admin.html') }) as Record<string, string>,
    },
  },
}));
