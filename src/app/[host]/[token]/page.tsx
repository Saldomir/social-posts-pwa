import { notFound } from 'next/navigation';
import StoryClient from './StoryClient';

// Always fetch fresh — a story_mit_sticker post can be edited up until the
// scheduled time, and the post type can change (which invalidates the token).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type StoryAsset = {
  post_id: number;
  post_type: string;
  channel: string;
  image_url: string;
  story_text: string;
  story_link: string;
  planned_for: string;
  first_opened_at: string;
};

/**
 * Allow only hostnames that look like real domains. Prevents this PWA from
 * being abused as a generic proxy — someone can't craft a URL that points us
 * at internal IPs, file:// URLs, or arbitrary ports.
 *
 * If you want stricter scoping, change this to e.g. `host.endsWith('.contentbakery.at')`
 * once all customer sites move under that umbrella.
 */
function isValidHost(host: string): boolean {
  if (!host || host.length > 253) return false;
  // RFC 1123 hostname: dot-separated labels, alphanumeric + hyphens.
  // Requires at least one dot so localhost / single-label internal hosts can't sneak through.
  return /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i.test(host);
}

export default async function StoryPage({
  params,
}: {
  params: Promise<{ host: string; token: string }>;
}) {
  const { host, token } = await params;

  if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  if (!isValidHost(host)) notFound();

  const res = await fetch(
    `https://${host}/wp-json/content-maschine/v1/story/${token}`,
    {
      cache: 'no-store',
      // 8s timeout — WP REST is usually <500ms; if it's slow something's wrong.
      signal: AbortSignal.timeout(8000),
    }
  );

  if (res.status === 404) notFound();
  if (res.status === 410) {
    return (
      <main className="mx-auto max-w-md p-6 pt-16 text-center">
        <div className="text-5xl mb-4" aria-hidden>⚠️</div>
        <h1 className="text-2xl font-semibold mb-2">Story nicht mehr verfügbar</h1>
        <p className="text-neutral-600">
          Der Beitragstyp wurde geändert oder die Story wurde bereits gepostet.
        </p>
      </main>
    );
  }
  if (!res.ok) {
    throw new Error(`WP responded ${res.status}`);
  }

  const data = (await res.json()) as StoryAsset;
  return <StoryClient data={data} />;
}
