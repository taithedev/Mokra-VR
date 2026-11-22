import './globals.css';
import './mokra-v2.css';
import './mokra-v4.css';
import './mokra-v5.css';

export const metadata = {
  title: { default: 'MOKRA — Into the Unknown', template: '%s | MOKRA' },
  description: 'MOKRA is an atmospheric multiplayer VR game in development. Explore, survive, and link your VR account.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'MOKRA — Into the Unknown',
    description: 'Arm-driven VR movement. An immersive world. An original interactive rainbow 3D character.',
    type: 'website'
  },
};
export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
