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

<h1>{labels.sessions.title}</h1>

<form method="GET" class="filters">
  <label>
    {labels.sessions.filterParticipant}
    <input name="participant" value={data.filter.participant} placeholder="P01" />
  </label>
  <label>
    {labels.sessions.filterStatus}
    <select name="status" value={data.filter.status}>
      <option value="">{labels.sessions.all}</option>
      <option value="complete">{labels.status.complete}</option>
      <option value="incomplete">{labels.status.incomplete}</option>
    </select>
  </label>
  <button type="submit">Filtrar</button>
</form>

{#if data.sessions.length === 0}
  <p class="empty">{labels.sessions.empty}</p>
{:else}
  <table>
    <thead>
      <tr>
        <th>{labels.sessions.participant}</th>
        <th>{labels.sessions.phase}</th>
        <th>{labels.sessions.case}</th>
        <th>{labels.sessions.status}</th>
        <th>{labels.sessions.started}</th>
        <th>{labels.sessions.duration}</th>
        <th>{labels.sessions.events}</th>
        <th>{labels.sessions.invalidEvents}</th>
      </tr>
    </thead>
    <tbody>
      {#each data.sessions as session (session.id)}
        <tr>
          <td><a href="/sessions/{session.id}">{session.participantCode}</a></td>
          <td>{labels.phase[session.phase as keyof typeof labels.phase] ?? session.phase}</td>
          <td>{session.caseId}</td>
          <td>
            <span class="badge {session.status}">
              {labels.status[session.status as keyof typeof labels.status] ?? session.status}
            </span>
          </td>
          <td>{formatDate(session.startedAt)}</td>
          <td>{formatDuration(session.durationMs)}</td>
          <td>{session.eventCount}</td>
          <td>{session.invalidEventCount}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  h1 {
    font-size: 1.25rem;
    margin: 0 0 1.25rem;
  }
  .filters {
    display: flex;
    gap: 0.9rem;
    align-items: end;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
  }
  .filters label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .filters input,
  .filters select {
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font: inherit;
    background: transparent;
    color: inherit;
    min-width: 11rem;
  }
  .filters button {
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .badge {
    display: inline-block;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    font-size: 0.78rem;
    border: 1px solid var(--border);
  }
  .badge.complete {
    color: #1a7f37;
    border-color: #1a7f3755;
  }
  .badge.incomplete {
    color: #b45309;
    border-color: #b4530955;
  }
  .empty {
    color: var(--muted);
  }
</style>
