'use client';

import dynamic from 'next/dynamic';

// The preview mounts real charts that measure their panel, so the studio renders client-side only.
const App = dynamic(() => import('../src/App').then((module) => module.App), { ssr: false });

export default function Page() {
  return <App />;
}
