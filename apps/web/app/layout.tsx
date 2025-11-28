import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'MiniMeet',
    template: '%s | MiniMeet',
  },
  description: 'Athletics event management and live results platform',
  keywords: ['athletics', 'track and field', 'friidrett', 'live results', 'competition management'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  );
}
