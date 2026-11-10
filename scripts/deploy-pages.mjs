// Publishes the static copy (dist-pages, built by `npm run build:pages`) to the gh-pages branch.
// GitHub Pages serves that branch at https://misterharryx.github.io/pole-dance-kiseleva/.
// The panel and the API live on Vercel (VITE_API_BASE in .env.pages); /admin here redirects there.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'dist-pages');
const git = (args, cwd = out) => execFileSync('git', args, { cwd, stdio: 'inherit' });

if (!existsSync(resolve(out, 'index.html'))) throw new Error('dist-pages is empty: run `npm run build:pages` first.');
const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: root, encoding: 'utf8' }).trim();
const apiBase = /^VITE_API_BASE=(.+)$/m.exec(readFileSync(resolve(root, '.env.pages'), 'utf8'))?.[1].trim().replace(/\/$/, '');
if (!apiBase) throw new Error('.env.pages has no VITE_API_BASE');

// GitHub Pages would otherwise skip files and folders that start with "_".
writeFileSync(resolve(out, '.nojekyll'), '');
// /admin on this copy opens the panel on Vercel.
mkdirSync(resolve(out, 'admin'), { recursive: true });
writeFileSync(
  resolve(out, 'admin', 'index.html'),
  `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Кабинет</title>` +
    `<meta http-equiv="refresh" content="0; url=${apiBase}/admin"><a href="${apiBase}/admin">Открыть кабинет</a>`,
);
// A fresh one-commit branch each time: the copy is rebuilt from source, its history is not needed.
rmSync(resolve(out, '.git'), { recursive: true, force: true });
git(['init', '-q', '-b', 'gh-pages']);
git(['add', '-A']);
git(['-c', 'user.name=Pole Dance Kiseleva site', '-c', 'user.email=noreply@github.com', 'commit', '-q', '-m', 'Static copy for GitHub Pages']);
git(['push', '-f', remote, 'gh-pages']);
rmSync(resolve(out, '.git'), { recursive: true, force: true });
console.log('Published: https://misterharryx.github.io/pole-dance-kiseleva/');
