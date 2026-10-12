import type { Metadata } from 'next';
import '@fontsource/bricolage-grotesque/latin-400.css';
import '@fontsource/bricolage-grotesque/latin-500.css';
import '@fontsource/bricolage-grotesque/latin-600.css';
import '@fontsource/bricolage-grotesque/latin-700.css';
import '@fontsource/bricolage-grotesque/latin-800.css';
import '@fontsource/dm-mono/latin-400.css';
import '@fontsource/dm-mono/latin-500.css';
import './globals.css';
import 'lenis/dist/lenis.css';
import './catalog.css';
import { Interactions } from '@/components/interactions';
export const metadata: Metadata = {
  title: 'TreasureTrove — Component inventory',
  description:
    'Search electronic parts by ID or component group, manage quantities, and sync your personal inventory.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Interactions>{children}</Interactions>
      </body>
    </html>
  );
}
