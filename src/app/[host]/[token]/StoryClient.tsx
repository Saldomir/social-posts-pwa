'use client';

import { useState } from 'react';
import type { StoryAsset } from './page';

/**
 * Build the same-origin proxy URL for a remote image. Avoids CORS so the
 * browser can fetch the image as a Blob → File → Web Share or download.
 */
function proxiedImageUrl(rawUrl: string, postId: number, index: number): string {
  // Try to keep a meaningful extension so save-to-Photos lands as .jpg/.png.
  let ext = 'jpg';
  try {
    const u = new URL(rawUrl);
    const m = u.pathname.match(/\.(jpg|jpeg|png|webp|heic|gif)$/i);
    if (m) ext = m[1].toLowerCase();
  } catch {
    /* fall through with default */
  }
  const filename = `story-${postId}-${index + 1}.${ext}`;
  return `/api/img?u=${encodeURIComponent(rawUrl)}&n=${encodeURIComponent(filename)}`;
}

/**
 * Tiny copy-to-clipboard button with a 1.8s "Kopiert" confirmation flash.
 */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          alert('Kopieren fehlgeschlagen — bitte manuell markieren.');
        }
      }}
      className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium active:scale-95 transition"
    >
      {copied ? '✓ Kopiert' : label}
    </button>
  );
}

/**
 * Save / share one story image. We always go through the same-origin proxy so
 * the fetch isn't blocked by WP's missing CORS headers.
 *
 * On iOS Safari, navigator.share with a File opens the native share sheet —
 * the user can pick "In Fotos sichern" (saves to Photos) or directly tap
 * "Instagram → Story hinzufügen" if Instagram is installed.
 *
 * On Android Chrome, the Web Share API behaves similarly when files are supported;
 * otherwise we fall back to a plain anchor download (saves to /Download).
 */
async function saveOrShareImage(proxiedUrl: string, filename: string) {
  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type });

    const nav = navigator as Navigator & {
      canShare?: (data: { files: File[] }) => boolean;
      share?: (data: { files: File[] }) => Promise<void>;
    };

    if (nav.canShare && nav.canShare({ files: [file] }) && nav.share) {
      await nav.share({ files: [file] });
      return;
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    console.error(e);
    alert('Speichern fehlgeschlagen. Bitte halte das Bild gedrückt und wähle "Bild sichern".');
  }
}

export default function StoryClient({
  data,
  images,
}: {
  data: StoryAsset;
  images: string[];
}) {
  const plannedDisplay = data.planned_for
    ? new Date(data.planned_for).toLocaleString('de-DE')
    : '';

  return (
    <main className="mx-auto max-w-md p-4 pb-16">
      <header className="text-center pt-6 pb-4">
        <div className="text-3xl" aria-hidden>📸</div>
        <h1 className="text-xl font-semibold mt-2">Story posten</h1>
        {plannedDisplay && (
          <p className="text-xs text-neutral-500 mt-1">Geplant für {plannedDisplay}</p>
        )}
        {images.length > 1 && (
          <p className="text-xs text-neutral-500 mt-1">
            {images.length} Bilder — speichere alle und füge sie nacheinander deiner Story hinzu.
          </p>
        )}
      </header>

      {images.map((rawUrl, idx) => {
        const proxied = proxiedImageUrl(rawUrl, data.post_id, idx);
        const filename = proxied.split('n=')[1]
          ? decodeURIComponent(proxied.split('n=')[1])
          : `story-${data.post_id}-${idx + 1}.jpg`;
        return (
          <section
            key={rawUrl}
            className="mt-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-neutral-200"
          >
            {images.length > 1 && (
              <div className="px-3 py-2 text-xs font-medium text-neutral-500 border-b border-neutral-100">
                Bild {idx + 1} von {images.length}
              </div>
            )}
            <img
              src={proxied}
              alt={`Story ${idx + 1}`}
              className="w-full aspect-[9/16] object-cover bg-neutral-100"
            />
            <button
              onClick={() => saveOrShareImage(proxied, filename)}
              className="w-full px-4 py-3 bg-neutral-900 text-white font-medium active:scale-95 transition"
            >
              {images.length > 1 ? `Bild ${idx + 1} speichern` : 'Bild speichern'}
            </button>
          </section>
        );
      })}

      {data.story_text && (
        <section className="mt-6 p-4 rounded-2xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-neutral-700">Story-Text</h2>
            <CopyButton value={data.story_text} label="Kopieren" />
          </div>
          <p className="text-sm whitespace-pre-wrap text-neutral-800">{data.story_text}</p>
        </section>
      )}

      {data.story_link && (
        <section className="mt-3 p-4 rounded-2xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-neutral-700">Link für Sticker</h2>
            <CopyButton value={data.story_link} label="Kopieren" />
          </div>
          <p className="text-sm break-all text-neutral-600">{data.story_link}</p>
        </section>
      )}

      {/* `instagram://story-camera` opens the IG app directly into the Story
          composer on both iOS and Android (when the app is installed). */}
      <a
        href="instagram://story-camera"
        className="mt-8 block w-full text-center px-6 py-4 rounded-2xl text-white font-semibold text-lg shadow-md active:scale-95 transition"
        style={{
          background:
            'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)',
        }}
      >
        Instagram öffnen
      </a>

      <ol className="mt-6 text-sm text-neutral-600 list-decimal pl-5 space-y-1">
        <li>
          {images.length > 1
            ? 'Alle Bilder nacheinander speichern'
            : 'Bild speichern'}
        </li>
        <li>Story-Text und Link kopieren</li>
        <li>Instagram öffnen → Story → gespeicherte Bilder auswählen</li>
        <li>Text einfügen, Link-Sticker mit dem kopierten Link einsetzen</li>
      </ol>
    </main>
  );
}
