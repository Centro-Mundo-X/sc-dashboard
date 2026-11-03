<script lang="ts">
  import { labels } from '#lib/labels';
  import SessionFilters from '#lib/components/SessionFilters.svelte';
  import SessionTable from '#lib/components/SessionTable.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  const count = $derived(data.sessions.length);
</script>

<svelte:head><title>{labels.sessions.title}</title></svelte:head>

<div class="mb-4 flex items-baseline gap-2">
  <h1 class="label">{labels.sessions.title}</h1>
  <span class="text-faint text-[0.6875rem]">
    {count}
    {count === 1 ? 'sesión' : 'sesiones'}
  </span>
</div>

<SessionFilters participant={data.filter.participant} status={data.filter.status} />

<SessionTable sessions={data.sessions} />
