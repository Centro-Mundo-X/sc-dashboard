<script lang="ts">
  import { labels } from '#lib/labels';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>{labels.appName}</title>
</svelte:head>

<div class="flex min-h-screen flex-col">
  <header class="border-b border-(--hairline) bg-(--panel)">
    <div class="mx-auto flex w-full max-w-6xl items-baseline justify-between px-5 py-3">
      <div class="flex items-baseline gap-3">
        <a href="/sessions" class="text-[0.8125rem] font-semibold tracking-tight no-underline">
          {labels.appName}
        </a>
        <span class="text-faint text-[0.75rem]">{labels.subtitle}</span>
      </div>
      <span class="label">Tesis · Bello Campo</span>
    </div>
  </header>

  <main class="mx-auto w-full max-w-6xl flex-1 px-5 py-6">
    {@render children()}
  </main>

  <footer class="mx-auto w-full max-w-6xl px-5 pb-6">
    <p class="text-faint border-t border-(--rule) pt-3 text-[0.6875rem]">
      Los criterios clínicos de esta versión son provisionales y están pendientes de aprobación.
    </p>
  </footer>
</div>
