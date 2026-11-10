import path from 'node:path';

/**
 * Server settings, all from environment variables (see .env.example).
 * Read lazily: in development Vite loads .env files into process.env after import.
 */
export const env = {
  get adminPassword() {
    return process.env.ADMIN_PASSWORD ?? '';
  },
  /** Signs session cookies; falls back to a value derived from the password. */
  get adminSecret() {
    return process.env.ADMIN_SECRET || (this.adminPassword ? `pdk:${this.adminPassword}` : '');
  },
  /** Days in the statistics are cut in this time zone. */
  get tz() {
    return process.env.ADMIN_TZ || 'Europe/Moscow';
  },
  /** Folder for requests, statistics and edits when there is no Redis (default `.data`). */
  get dataDir() {
    return path.resolve(process.env.PDK_DATA_DIR || path.join(process.cwd(), '.data'));
  },
  get redisUrl() {
    return process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  },
  get redisToken() {
    return process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  },
  get onVercel() {
    return Boolean(process.env.VERCEL);
  },
  get production() {
    return process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL);
  },
};

export const adminConfigured = () => env.adminPassword.length > 0;
