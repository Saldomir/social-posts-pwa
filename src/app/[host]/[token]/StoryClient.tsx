'use client';

import { useState } from 'react';
import type { StoryAsset } from './page';

/**
 * Tiny copy-to-clipboard button with a 1.8s "Kopiert" confirmation flash.
 * Returns null when there's nothing to copy so the surrounding layout stays clean.
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
 * Save the story image to the user's device.
 * - On iOS Safari, navigator.share with a File opens the native share sheet
 *   which lets the user "Save Image" → Photos. That's the path Instagram needs
 *   the image to be on for Story posting.
 * - On everything else, falls back to a regular <a download>.
 */
async function downloadImage(url: string, filename = 'story.jpg') {
  try {
    const res = await fetch(url);
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
    alert('Download fehlgeschlagen.');
  }
}

export default function StoryClient({ data }: { data: StoryAsset }) {
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
      </header>

      <section className="rounded-2xl overflow-hidden bg-white shadow-sm border border-neutral-200">
        {/* Story aspect = 9:16. We keep it via CSS aspect-ratio so the layout
            stays predictable even if the image takes a moment to load. */}
        <img
          src={data.image_url}
          alt="Story"
          className="w-full aspect-[9/16] object-cover"
        />
      </section>

      <div className="mt-3">
        <button
          onClick={() => downloadImage(data.image_url, `story-${data.post_id}.jpg`)}
          className="w-full px-4 py-3 rounded-xl bg-neutral-900 text-white font-medium active:scale-95 transition"
        >
          Bild speichern
        </button>
      </div>

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
          composer on both iOS and Android (when the app is installed). If the
          app isn't installed the link is a no-op — the instructions below
          still let the user complete the flow manually. */}
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
        <li>Bild speichern</li>
        <li>Story-Text und Link kopieren</li>
        <li>Instagram öffnen → Story → gespeichertes Bild auswählen</li>
        <li>Text einfügen, Link-Sticker mit dem kopierten Link einsetzen</li>
      </ol>
    </main>
  );
}
