import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Finance Tracker',
    short_name: 'Finance',
    description: 'Track your expenses, income, budgets, and savings with a clean, minimal personal finance dashboard.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    categories: ['finance', 'productivity'],
    icons: [
      // "any" variants render the true icon; "maskable" variants let the OS
      // apply its own shape mask. Providing both avoids cropped home-screen icons.
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
