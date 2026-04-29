# social-posts-pwa — deployment notes

## 1. Local scaffold (one time)

```powershell
cd C:\Users\matth\Downloads
npx create-next-app@latest social-posts-pwa --ts --app --tailwind --eslint --src-dir --import-alias "@/*"
cd social-posts-pwa
npm install @ducanh2912/next-pwa
```

Accept defaults at every prompt. After it finishes, **copy the prepared files
from this folder over the generated ones** (overwrite when asked):

- `next.config.mjs`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/[token]/page.tsx`        (new file)
- `src/app/[token]/StoryClient.tsx` (new file)
- `public/manifest.webmanifest`
- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `.env.example`

Add icons to `public/`:

- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `apple-touch-icon.png` — 180×180

(Placeholder solid-color PNGs are fine for now; swap real ones later.)

## 2. Local dev

```powershell
copy .env.example .env.local
# edit .env.local — set NEXT_PUBLIC_WP_BASE to your WP site URL
npm run dev
```

Open http://localhost:3000 — the bare landing page.
Open http://localhost:3000/<64-hex-token> with a real token to test the asset page.

## 3. Server deploy

Push the project to a Git repo, then on the server:

```bash
cd /opt   # or wherever you keep app sources
git clone <repo> social-posts-pwa
cd social-posts-pwa

cp .env.example .env
# edit .env — set NEXT_PUBLIC_WP_BASE

docker compose up -d --build
docker compose logs -f
```

Verify:
```bash
curl -I http://127.0.0.1:3000          # 200 from inside the host
curl -I https://social-posts.contentbakery.at   # 200 via nginx + TLS
```

## 4. Updates

```bash
git pull
docker compose up -d --build
```

`NEXT_PUBLIC_WP_BASE` is baked into the client bundle at build time
(that's a Next.js `NEXT_PUBLIC_*` rule), so any change to it requires
a rebuild.
