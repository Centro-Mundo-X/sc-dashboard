<script lang="ts">
  import { labels } from '#lib/labels';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>{labels.appName}</title>
  <link rel="preconnect" href="https://rsms.me/" />
  <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
</svelte:head>

<div class="flex min-h-screen flex-col">
  <header class="border-b border-(--hairline) bg-(--panel)">
    <div class="mx-auto flex w-full max-w-5xl items-baseline gap-3 px-6 py-5">
      <a href="/sessions" class="flex items-baseline gap-2.5 no-underline">
        <span class="grid size-7 place-items-center rounded-md bg-accent-600 text-sm font-semibold text-white">
          SC
        </span>
        <span class="text-[0.95rem] font-semibold tracking-tight text-(--text)">{labels.appName}</span>
      </a>
      <span class="text-soft text-[0.8rem]">{labels.subtitle}</span>
    </div>
  </header>

  <main class="mx-auto w-full max-w-5xl flex-1 px-6 pb-20 pt-8">
    {@render children()}
  </main>
</div>
