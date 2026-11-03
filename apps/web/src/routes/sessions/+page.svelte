<script lang="ts">
  import { labels } from '#lib/labels';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  function formatDuration(ms: number | null): string {
    if (ms === null) return '—';
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}m ${seconds}s`;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  }
</script>

<svelte:head><title>{labels.sessions.title}</title></svelte:head>

<div class="mb-6 flex items-end justify-between gap-4">
  <div>
    <h1 class="text-xl font-semibold tracking-tight">{labels.sessions.title}</h1>
    <p class="text-soft mt-0.5 text-[0.8rem]">
      {data.sessions.length}
      {data.sessions.length === 1 ? 'sesión' : 'sesiones'}
    </p>
  </div>
</div>

<form method="GET" class="mb-5 flex flex-wrap items-end gap-3">
  <label class="grid gap-1.5">
    <span class="text-soft text-[0.7rem] font-medium tracking-wide uppercase">
      {labels.sessions.filterParticipant}
    </span>
    <input
      name="participant"
      value={data.filter.participant}
      placeholder="P01"
      class="w-36 rounded-lg border border-(--hairline) bg-(--panel) px-3 py-2 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
    />
  </label>

  <label class="grid gap-1.5">
    <span class="text-soft text-[0.7rem] font-medium tracking-wide uppercase">
      {labels.sessions.filterStatus}
    </span>
    <select
      name="status"
      value={data.filter.status}
      class="w-40 rounded-lg border border-(--hairline) bg-(--panel) px-3 py-2 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
    >
      <option value="">{labels.sessions.all}</option>
      <option value="complete">{labels.status.complete}</option>
      <option value="incomplete">{labels.status.incomplete}</option>
    </select>
  </label>

  <button
    type="submit"
    class="rounded-lg border border-(--hairline) bg-(--panel) px-4 py-2 text-sm font-medium transition hover:bg-(--hover)"
  >
    Filtrar
  </button>
</form>

{#if data.sessions.length === 0}
  <div class="panel grid place-items-center px-6 py-16 text-center">
    <p class="text-soft text-sm">{labels.sessions.empty}</p>
  </div>
{:else}
  <div class="panel overflow-hidden">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="border-b border-(--hairline) bg-(--surface)">
          <th class="px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.participant}
          </th>
          <th class="px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.phase}
          </th>
          <th class="px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.case}
          </th>
          <th class="px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.status}
          </th>
          <th class="px-4 py-2.5 text-left text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.started}
          </th>
          <th class="px-4 py-2.5 text-right text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.duration}
          </th>
          <th class="px-4 py-2.5 text-right text-[0.7rem] font-semibold tracking-wide text-(--text-soft) uppercase">
            {labels.sessions.events}
          </th>
        </tr>
      </thead>
      <tbody>
        {#each data.sessions as session (session.id)}
          <tr class="border-b border-(--hairline) transition last:border-0 hover:bg-(--hover)">
            <td class="px-4 py-3">
              <a
                href="/sessions/{session.id}"
                class="font-mono text-[0.85rem] font-medium text-accent-600 hover:underline dark:text-accent-500"
              >
                {session.participantCode}
              </a>
            </td>
            <td class="px-4 py-3 text-(--text-soft)">
              {labels.phase[session.phase as keyof typeof labels.phase] ?? session.phase}
            </td>
            <td class="px-4 py-3 font-mono text-[0.78rem] text-(--text-soft)">{session.caseId}</td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.72rem] font-medium {session.status ===
                'complete'
                  ? 'bg-signal-ok/10 text-signal-ok'
                  : 'bg-signal-warn/15 text-signal-warn'}"
              >
                <span
                  class="size-1.5 rounded-full {session.status === 'complete'
                    ? 'bg-signal-ok'
                    : 'bg-signal-warn'}"
                ></span>
                {labels.status[session.status as keyof typeof labels.status] ?? session.status}
              </span>
            </td>
            <td class="px-4 py-3 text-(--text-soft)">{formatDate(session.startedAt)}</td>
            <td class="px-4 py-3 text-right text-(--text-soft)">{formatDuration(session.durationMs)}</td>
            <td class="px-4 py-3 text-right">
              {session.eventCount}
              {#if session.invalidEventCount > 0}
                <span class="ml-1 text-[0.7rem] text-signal-warn" title={labels.sessions.invalidEvents}>
                  +{session.invalidEventCount}
                </span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
