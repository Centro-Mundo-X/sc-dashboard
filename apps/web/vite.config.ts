import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  /**
   * `better-sqlite3` ships a native CJS binding. Bundling it leaves `__dirname`
   * and the prebuilt paths unresolved at runtime, so it stays external and is
   * required from node_modules instead.
   */
  ssr: {
    external: ['better-sqlite3'],
  },
  plugins: [
    tailwindcss(),
    sveltekit({
      compilerOptions: {
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
      },
      adapter: adapter(),
    }),
  ],
});
