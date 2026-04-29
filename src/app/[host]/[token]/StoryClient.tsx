'use client';

import { useState } from 'react';
import type { StoryAsset } from './page';

/**
 * Build the same-origin proxy URL for a remote image. Avoids CORS so the
 * browser can fetch the image as a Blob → File → Web Share or download.
 */
function proxiedImageUrl(rawUrl: string, postId: number, index: number): {
  url: string;
  filename: string;
} {
  let ext = 'jpg';
  try {
    const u = new URL(rawUrl);
    const m = u.pathname.match(/\.(jpg|jpeg|png|webp|heic|gif)$/i);
    if (m) ext = m[1].toLowerCase();
  } catch {
    /* default jpg */
  }
  const filename = `story-${postId}-${index + 1}.${ext}`;
  return {
    url: `/api/img?u=${encodeURIComponent(rawUrl)}&n=${encodeURIComponent(filename)}`,
    filename,
  };
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
 * Open the native share sheet with the image as a File. On iOS Safari this
 * surfaces "In Fotos sichern" (saves to Photos) and an Instagram tile if
 * Instagram is installed → "Story hinzufügen" pre-fills the composer.
 */
async function shareImage(proxiedUrl: string, filename: string) {
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

    alert(
      'Teilen wird auf diesem Gerät nicht unterstützt. Nutze "Bild speichern" und füge das Bild manuell deiner Story hinzu.'
    );
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return; // user cancelled the share sheet
    console.error(e);
    alert('Teilen fehlgeschlagen.');
  }
}

/**
 * Force-download to disk / Photos. Uses an object URL with the `download`
 * attribute so the browser saves rather than navigates.
 */
async function downloadImage(proxiedUrl: string, filename: string) {
  try {
    const res = await fetch(proxiedUrl);
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  } catch (e) {
    console.error(e);
    alert('Download fehlgeschlagen. Halte das Bild gedrückt und wähle "Bild sichern".');
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

  const igGradient =
    'linear-gradient(135deg, #833ab4 0%, #fd1d1d 50%, #fcb045 100%)';

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
            {images.length} Bilder — füge sie nacheinander deiner Story hinzu.
          </p>
        )}
      </header>

      {/* Instructions live above the assets so first-time users learn the flow
          before they start tapping. The list is short and sits in a soft purple
          card so it's clearly a guide, not content to interact with. */}
      <section className="mt-2 p-4 rounded-2xl bg-purple-50 border border-purple-100">
        <h2 className="text-sm font-semibold text-purple-900 mb-2">So geht&apos;s</h2>
        {images.length > 1 ? (
          <ol className="text-sm text-purple-900/90 list-decimal pl-5 space-y-1.5">
            <li>Alle Bilder unten einzeln speichern</li>
            <li>
              <strong>Instagram-App öffnen</strong> → Story-Kamera → Galerie →
              gespeicherte Bilder nacheinander auswählen
            </li>
            <li>
              Pro Story-Segment auf diese Seite zurückkommen, <strong>Story-Text</strong>{' '}
              und dann <strong>Link</strong> kopieren und in Instagram einfügen
            </li>
            <li>Link-Sticker einsetzen → Story posten 🎉</li>
          </ol>
        ) : (
          <ol className="text-sm text-purple-900/90 list-decimal pl-5 space-y-1.5">
            <li>
              <strong>Bild in Instagram öffnen</strong> antippen, dann{' '}
              <strong>Instagram Stories</strong> wählen.
              <br />
              <span className="text-purple-900/70 text-xs">
                Falls das Icon nicht sichtbar ist, zuerst auf <strong>„Mehr&quot;</strong> tippen.
              </span>
            </li>
            <li>
              Auf diese Seite zurückkommen, <strong>Story-Text kopieren</strong>{' '}
              → in Instagram als Textelement einfügen
            </li>
            <li>
              Erneut zurückkommen, <strong>Link kopieren</strong> → in Instagram
              Link-Sticker einsetzen
            </li>
            <li>Story posten 🎉</li>
          </ol>
        )}
      </section>

      {images.map((rawUrl, idx) => {
        const { url: proxied, filename } = proxiedImageUrl(rawUrl, data.post_id, idx);
        const isSingle = images.length === 1;
        return (
          <section
            key={rawUrl}
            className="mt-4 rounded-2xl overflow-hidden bg-white shadow-sm border border-neutral-200"
          >
            {!isSingle && (
              <div className="px-3 py-2 text-xs font-medium text-neutral-500 border-b border-neutral-100">
                Bild {idx + 1} von {images.length}
              </div>
            )}
            <img
              src={proxied}
              alt={`Story ${idx + 1}`}
              className="w-full aspect-[9/16] object-cover bg-neutral-100"
            />
            <div className="p-3 space-y-2">
              {/* For a single image we offer the share-sheet path as primary —
                  it's the fewest taps to get to a Story. For multi-image we
                  hide it: each share opens IG fresh and would discard the
                  previous segment. Multi-image flow is "save all → open IG → pick all from camera roll". */}
              {isSingle && (
                <button
                  onClick={() => shareImage(proxied, filename)}
                  className="w-full px-4 py-3 rounded-xl text-white font-semibold shadow-sm active:scale-95 transition"
                  style={{ background: igGradient }}
                >
                  Bild in Instagram öffnen
                </button>
              )}
              <button
                onClick={() => downloadImage(proxied, filename)}
                className={
                  isSingle
                    ? 'w-full px-4 py-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-sm font-medium active:scale-95 transition'
                    : 'w-full px-4 py-3 rounded-xl bg-neutral-900 text-white font-medium active:scale-95 transition'
                }
              >
                {isSingle ? 'Bild speichern' : `Bild ${idx + 1} speichern`}
              </button>
            </div>
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

      {/* The bottom "Instagram öffnen" button. For a single image the share-sheet
          button above is the primary path, so this is muted (just a hop into the
          app). For multi-image the user has to pick all images from the camera
          roll inside IG anyway, so this *is* the primary CTA — gradient. */}
      <a
        href="instagram://story-camera"
        className={
          images.length > 1
            ? 'mt-8 block w-full text-center px-6 py-4 rounded-2xl text-white font-semibold text-lg shadow-md active:scale-95 transition'
            : 'mt-8 block w-full text-center px-6 py-4 rounded-2xl bg-neutral-900 text-white font-medium active:scale-95 transition'
        }
        style={
          images.length > 1
            ? { background: igGradient }
            : undefined
        }
      >
        {images.length > 1 ? 'Instagram öffnen' : 'Instagram-App öffnen'}
      </a>

    </main>
  );
}
