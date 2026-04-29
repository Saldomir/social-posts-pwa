import withPWAInit from '@ducanh2912/next-pwa';

// PWA wrapper: registers a service worker, handles offline caching of static
// assets, and disables itself in dev so HMR isn't interfered with.
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  scope: '/',
  workboxOptions: {
    disableDevLogs: true,
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `standalone` produces a minimal Node server in .next/standalone — what the
  // Dockerfile copies. Keeps the runtime image tiny.
  output: 'standalone',

  // We render WP-uploaded images via plain <img>, but if you ever switch to
  // next/image you'll want this allowlist.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};

export default withPWA(nextConfig);
