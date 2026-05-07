import type { Metadata, Viewport } from 'next';
import '../src/index.css';
import ServiceWorkerRegister from './ServiceWorkerRegister';

export const metadata: Metadata = {
  title: 'Shri Mauli Stone Crusher',
  description: 'Shri Mauli Stone Crusher management dashboard',
  applicationName: 'Shri Mauli Stone Crusher',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Shri Mauli',
  },
  icons: {
    apple: [
      { url: '/shri-mauli-icon-192.png' },
      { url: '/shri-mauli-icon-512.png', sizes: '512x512' },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: '#F59E0B',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
