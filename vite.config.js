import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

// The source was written for Next.js; these aliases map the imports onto the
// shims already in src/lib so it runs under Vite.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${src}/` },
      { find: /^next\/link$/, replacement: `${src}/lib/next-link-shim.tsx` },
      { find: /^next\/navigation$/, replacement: `${src}/lib/next-navigation-shim.ts` },
      { find: /^next\/server$/, replacement: `${src}/lib/next-server-shim.ts` },
      { find: /^next$/, replacement: `${src}/lib/next-shim.ts` },
    ],
  },
});
