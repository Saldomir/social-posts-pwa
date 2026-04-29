/**
 * Image proxy: /api/img?u=<encoded-wp-image-url>&n=<filename>
 *
 * Why: WordPress origins typically don't send Access-Control-Allow-Origin on
 * uploads/, so the browser blocks `fetch(image_url).blob()` with a CORS error.
 * That breaks the "save image / share to Instagram" flow we need for stories.
 *
 * Solution: the Next.js server fetches the image (no CORS — server-to-server),
 * then streams it back to the same-origin client. The browser is happy, we
 * keep the rename-on-download capability via the `n` param.
 *
 * Security:
 *  - Only http(s) URLs allowed.
 *  - Hostname must look like a real RFC 1123 hostname (no localhost / IPs).
 *  - Content-Type from upstream is forwarded only if it's an image/*; otherwise
 *    we 415, so this can't be abused as a generic web proxy.
 */

import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('u');
  const filename = req.nextUrl.searchParams.get('n') ?? 'image';

  if (!url) return new Response('missing u', { status: 400 });

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response('bad url', { status: 400 });
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return new Response('bad protocol', { status: 400 });
  }
  if (!HOSTNAME_RE.test(parsed.hostname)) {
    return new Response('bad host', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(parsed.toString(), {
      // Bound the wait so a slow/unreachable origin can't hold a worker forever.
      signal: AbortSignal.timeout(15000),
      // We don't pass through cookies — this is a public asset fetch.
      headers: { 'User-Agent': 'social-posts-pwa/1.0' },
    });
  } catch {
    return new Response('upstream unreachable', { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    return new Response('upstream error', { status: 502 });
  }

  const ctype = upstream.headers.get('content-type') ?? '';
  if (!ctype.startsWith('image/')) {
    return new Response('not an image', { status: 415 });
  }

  // Sanitize filename — strip path separators, keep extension.
  const safeName = filename.replace(/[/\\?%*:|"<>\x00-\x1f]/g, '_').slice(0, 120);

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': ctype,
      'Content-Disposition': `inline; filename="${safeName}"`,
      // Cache aggressively at the edge — the WP image URL is hashed/uuid'd
      // so it's effectively immutable.
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
