<script lang="ts">
  import { enhance } from '$app/forms';
  import { labels } from '#lib/labels';
  import type { PageProps } from './$types';

  let { form }: PageProps = $props();
</script>

<svelte:head><title>{labels.login.title}</title></svelte:head>

<div class="mx-auto mt-24 w-full max-w-xs">
  <h1 class="label mb-4 border-b border-(--hairline) pb-2">{labels.login.title}</h1>

  <form method="POST" use:enhance class="grid gap-3">
    <label class="grid gap-1">
      <span class="text-faint text-[0.6875rem] font-medium tracking-wider uppercase">
        {labels.login.username}
      </span>
      <input
        name="username"
        value={form?.username ?? ''}
        autocomplete="username"
        required
        class="field"
      />
    </label>

    <label class="grid gap-1">
      <span class="text-faint text-[0.6875rem] font-medium tracking-wider uppercase">
        {labels.login.password}
      </span>
      <input
        type="password"
        name="password"
        autocomplete="current-password"
        required
        class="field"
      />
    </label>

    {#if form?.error}
      <p class="border-l-2 border-signal-danger pl-2 text-[0.75rem] text-signal-danger">
        {labels.login.error}
      </p>
    {/if}

    <button
      type="submit"
      class="mt-1 border border-(--accent) bg-(--accent) px-3 py-1.5 text-[0.8125rem] font-medium text-(--panel) transition hover:opacity-85"
    >
      {labels.login.submit}
    </button>
  </form>
</div>
