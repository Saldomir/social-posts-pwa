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
  /** First image — kept for backward compat with older plugin versions. */
  image_url: string;
  /** Ordered list of all images for multi-segment Story posting. */
  image_urls?: string[];
  story_text: string;
  story_link: string;
  planned_for: string;
  first_opened_at: string;
};

/**
 * Allow only hostnames that look like real domains. Prevents this PWA from
 * being abused as a generic proxy — someone can't craft a URL that points us
 * at internal IPs, file:// URLs, or arbitrary ports.
 */
function isValidHost(host: string): boolean {
  if (!host || host.length > 253) return false;
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

  // Normalize: older plugin versions only sent image_url; newer ones send image_urls.
  // Always pass an array down so the client doesn't branch.
  const images =
    Array.isArray(data.image_urls) && data.image_urls.length > 0
      ? data.image_urls
      : data.image_url
      ? [data.image_url]
      : [];

  return <StoryClient data={data} images={images} />;
}
