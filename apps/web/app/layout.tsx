import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'ORYQON — The commercial internet under one command layer',
    template: '%s · ORYQON',
  },
  description:
    'ORYQON unifies product intelligence, content operations, channel distribution, customer workflows and live commercial analytics — governed through verifiable, human-approved execution.',
  applicationName: 'ORYQON',
  authors: [{ name: 'Frank Asante Van Laarhoven' }],
  creator: 'Frank Asante Van Laarhoven',
  publisher: 'Frank Asante Van Laarhoven',
  keywords: [
    'commercial operations',
    'command layer',
    'verified execution',
    'campaign orchestration',
    'enterprise commerce',
  ],
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#050607',
  colorScheme: 'dark',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
