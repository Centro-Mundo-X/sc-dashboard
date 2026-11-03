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

<div class="mb-4 flex items-baseline gap-2">
  <h1 class="label">{labels.sessions.title}</h1>
  <span class="text-faint text-[0.6875rem]">
    {data.sessions.length}
    {data.sessions.length === 1 ? 'sesión' : 'sesiones'}
  </span>
</div>

<form method="GET" class="mb-4 flex flex-wrap items-end gap-2 border-y border-(--rule) py-3">
  <label class="grid gap-1">
    <span class="text-faint text-[0.65rem] tracking-wider uppercase">
      {labels.sessions.filterParticipant}
    </span>
    <input name="participant" value={data.filter.participant} placeholder="P01" class="field w-28" />
  </label>

  <label class="grid gap-1">
    <span class="text-faint text-[0.65rem] tracking-wider uppercase">
      {labels.sessions.filterStatus}
    </span>
    <select name="status" value={data.filter.status} class="field w-32">
      <option value="">{labels.sessions.all}</option>
      <option value="complete">{labels.status.complete}</option>
      <option value="incomplete">{labels.status.incomplete}</option>
    </select>
  </label>

  <button
    type="submit"
    class="border border-(--hairline) bg-(--panel) px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-(--hover)"
  >
    Filtrar
  </button>
</form>

{#if data.sessions.length === 0}
  <p class="text-faint py-10 text-center text-[0.8125rem]">{labels.sessions.empty}</p>
{:else}
  <table class="w-full border-collapse">
    <thead>
      <tr class="border-b border-(--hairline)">
        <th class="label px-2 py-1.5 text-left font-semibold">
          {labels.sessions.participant}
        </th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.phase}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.case}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.status}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.started}</th>
        <th class="label px-2 py-1.5 text-right font-semibold">{labels.sessions.duration}</th>
        <th class="label px-2 py-1.5 text-right font-semibold">{labels.sessions.events}</th>
      </tr>
    </thead>
    <tbody>
      {#each data.sessions as session (session.id)}
        <tr class="border-b border-(--rule) hover:bg-(--hover)">
          <td class="px-2 py-2">
            <a href="/sessions/{session.id}" class="font-mono text-[0.8125rem] font-medium underline-offset-2 hover:underline">
              {session.participantCode}
            </a>
          </td>
          <td class="text-soft px-2 py-2">
            {labels.phase[session.phase as keyof typeof labels.phase] ?? session.phase}
          </td>
          <td class="text-soft px-2 py-2 font-mono text-[0.75rem]">{session.caseId}</td>
          <td class="px-2 py-2">
            <span
              class="inline-flex items-center gap-1.5 text-[0.75rem] font-medium {session.status ===
              'complete'
                ? 'text-signal-ok'
                : 'text-signal-warn'}"
            >
              <span
                class="h-3 w-0.5 {session.status === 'complete' ? 'bg-signal-ok' : 'bg-signal-warn'}"
              ></span>
              {labels.status[session.status as keyof typeof labels.status] ?? session.status}
            </span>
          </td>
          <td class="text-soft px-2 py-2">{formatDate(session.startedAt)}</td>
          <td class="text-soft px-2 py-2 text-right">{formatDuration(session.durationMs)}</td>
          <td class="px-2 py-2 text-right">
            {session.eventCount}
            {#if session.invalidEventCount > 0}
              <span class="ml-1 text-[0.6875rem] text-signal-warn" title={labels.sessions.invalidEvents}>
                +{session.invalidEventCount}
              </span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
