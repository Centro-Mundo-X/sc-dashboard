<script lang="ts">
  import { enhance } from '$app/forms';
  import { labels } from '#lib/labels';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<svelte:head><title>{labels.login.title}</title></svelte:head>

<div class="mx-auto mt-16 max-w-sm">
  <div class="panel p-7 shadow-sm">
    <h1 class="mb-1 text-lg font-semibold tracking-tight">{labels.login.title}</h1>
    <p class="text-soft mb-6 text-[0.8rem]">{labels.subtitle}</p>

    <form method="POST" use:enhance class="grid gap-4">
      <label class="grid gap-1.5">
        <span class="text-soft text-[0.75rem] font-medium tracking-wide uppercase">
          {labels.login.username}
        </span>
        <input
          name="username"
          value={form?.username ?? ''}
          autocomplete="username"
          required
          class="rounded-lg border border-(--hairline) bg-(--surface) px-3 py-2 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
        />
      </label>

      <label class="grid gap-1.5">
        <span class="text-soft text-[0.75rem] font-medium tracking-wide uppercase">
          {labels.login.password}
        </span>
        <input
          type="password"
          name="password"
          autocomplete="current-password"
          required
          class="rounded-lg border border-(--hairline) bg-(--surface) px-3 py-2 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
        />
      </label>

      {#if form?.error}
        <p class="rounded-md bg-signal-danger/10 px-3 py-2 text-[0.8rem] text-signal-danger">
          {labels.login.error}
        </p>
      {/if}

      <button
        type="submit"
        class="mt-1 rounded-lg bg-accent-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-700 active:scale-[0.99]"
      >
        {labels.login.submit}
      </button>
    </form>
  </div>
</div>
