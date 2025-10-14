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

const DEFAULT_ORIGIN = 'http://localhost:3000';
const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

export class CorsUtils {

    /**
     * Sets CORS headers on the response
     * Must be called before any response is sent
     */
    static setCors(res: VercelResponse, req: VercelRequest): void {
        const origin = req.headers.origin
            || req.headers.referer
            || DEFAULT_ORIGIN;

        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
        res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);

        // Optional: Enable for cookies/credentials
        // res.setHeader('Access-Control-Allow-Credentials', 'true');
        // res.setHeader('Access-Control-Max-Age', '86400');
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