import './globals.css';
import './mokra-v2.css';
export const metadata = {
  title: { default: 'MOKRA — The Dark Remembers', template: '%s | MOKRA' },
  description: 'MOKRA is a multiplayer VR adventure in development. Meet the creatures, explore what is coming, and connect your game account.',
  icons: { icon: '/favicon.svg' },
  openGraph: { title: 'MOKRA — The Dark Remembers', description: 'Find your people. Follow the signal. Discover an original multiplayer VR adventure.', type: 'website' },
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
