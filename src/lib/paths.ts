/**
 * The same code builds two copies of the site:
 * - Vercel: files at the root, the API and the panel next to the page;
 * - GitHub Pages (misterharryx.github.io/pole-dance-kiseleva/): files under a sub-folder and no
 *   server of its own, so requests, edits and the panel live on the Vercel copy (VITE_API_BASE).
 */
const API_BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '');
const BASE = import.meta.env.BASE_URL;

/** A file from public/ ("/photos/x.webp") with the folder the site is served from. Full URLs pass as they are. */
export const asset = (path: string) => (path.startsWith('/') && !path.startsWith('//') && !path.startsWith(BASE) ? BASE + path.slice(1) : path);

/** An address on the server: "/api/…" next to the page on Vercel, the full Vercel URL on GitHub Pages. */
export const serverUrl = (path: string) => API_BASE + path;

/** A photo path from site.ts or the panel: uploads ("/api/media/…") come from the server, the rest from the site. */
export const mediaUrl = (path: string) => (path.startsWith('/api/') ? serverUrl(path) : asset(path));

/** Where the studio's panel opens. */
export const adminUrl = () => serverUrl('/admin');
