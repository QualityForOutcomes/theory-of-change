/**
 * CORS (Cross-Origin Resource Sharing) Utilities
 * 
 * Handles CORS configuration for Vercel serverless functions.
 * 
 * Usage:
 * ```typescript
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   CorsUtils.setCors(res, req);
 *   if (CorsUtils.handleOptions(req, res)) return;
 *   // Your handler logic here
 * }
 * ```
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Development defaults; override in production via ALLOWED_ORIGINS env var
const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://toc-userfrontend.vercel.app',
    'https://toc-adminfrontend.vercel.app'
];
const DEFAULT_ORIGIN = DEFAULT_ALLOWED_ORIGINS[0];

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

function getAllowedOrigins(): string[] {
    const fromEnv = (process.env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_ORIGINS;
}

export class CorsUtils {

    /**
     * Sets CORS headers on the response
     * Must be called before any response is sent
     */
    static setCors(res: VercelResponse, req: VercelRequest): void {
        const ALLOWED_ORIGINS = getAllowedOrigins();

        const requestOrigin = (req.headers.origin as string)
            || (req.headers.referer as string)
            || DEFAULT_ORIGIN;

        let candidate = requestOrigin;
        try {
            candidate = new URL(requestOrigin).origin;
        } catch {
            // keep original value if not a full URL
        }

        const originToSet = ALLOWED_ORIGINS.includes(candidate)
            ? candidate
            : ALLOWED_ORIGINS[0] || DEFAULT_ORIGIN;

        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', originToSet);
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
        res.setHeader('Access-Control-Max-Age', '86400');
        res.setHeader('Vary', 'Origin');

        // Basic security hardening for API responses
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'no-referrer');
        // A minimal CSP suitable for API endpoints
        res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

        // Optional: Enable for cookies/credentials
        // res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    /**
     * Handles CORS preflight OPTIONS requests
     * Returns true if OPTIONS was handled (caller should return)
     */
    static handleOptions(req: VercelRequest, res: VercelResponse): boolean {
        if (req.method === 'OPTIONS') {
            res.status(200).end();
            return true;
        }
        return false;
    }
}

// Usage Examples:
//
// Basic Handler:
// export default async function handler(req, res) {
//   CorsUtils.setCors(res, req);
//   if (CorsUtils.handleOptions(req, res)) return;
//   const data = await getData();
//   res.json({ data });
// }
//
// With Error Handling:
// export default async function handler(req, res) {
//   try {
//     CorsUtils.setCors(res, req);
//     if (CorsUtils.handleOptions(req, res)) return;
//     const data = await riskyOperation();
//     res.json({ data });
//   } catch (error) {
//     res.status(500).json({ error: 'Internal error' });
//   }
// }
//
// Production Origin Whitelisting:
// const ALLOWED_ORIGINS = [
//   'https://myapp.com',
//   'http://localhost:3000',
//   'http://localhost:3001'
// ];
// const origin = ALLOWED_ORIGINS.includes(requestOrigin)
//   ? requestOrigin
//   : ALLOWED_ORIGINS[0];