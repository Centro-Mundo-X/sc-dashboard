<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { labels, indicatorLabel, metricLabel } from '#lib/labels';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  let reason = $state('');

  // Seed the input once from the loaded session.
  $effect.pre(() => {
    reason = data.session.incompleteReason ?? '';
  });
  let saving = $state(false);
  let saved = $state(false);

  type MetricRow = (typeof data.metrics)[number];

  const grouped = $derived.by(() => {
    const map = new Map<string, MetricRow[]>();
    for (const metric of data.metrics) {
      const bucket = map.get(metric.indicator);
      if (bucket) bucket.push(metric);
      else map.set(metric.indicator, [metric]);
    }
    return [...map.entries()];
  });

  function formatValue(metric: MetricRow): string {
    if (metric.valueType === 'not_evaluable') {
      return `${labels.session.notEvaluable}: ${metric.notEvaluableReason ?? ''}`;
    }
    if (metric.valueType === 'boolean') {
      return metric.valueBool ? labels.value.yes : labels.value.no;
    }
    if (metric.valueType === 'ratio') {
      const value = metric.valueNumber ?? 0;
      return `${Math.round(value * 100)}%`;
    }
    if (metric.valueType === 'number') {
      const value = metric.valueNumber ?? 0;
      return metric.metric.endsWith('_ms') ? `${value} ${labels.value.ms}` : String(value);
    }
    return metric.valueText ?? '—';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  }

  async function saveReason() {
    saving = true;
    await fetch(`/api/sessions/${data.session.id}/incomplete-reason`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    saving = false;
    saved = true;
    await invalidateAll();
  }
</script>

<svelte:head><title>{labels.appName} · {data.session.participantCode}</title></svelte:head>

<a class="back" href="/sessions">← {labels.session.back}</a>

<h1>
  {data.session.participantCode}
  <span class="badge {data.session.status}">
    {labels.status[data.session.status as keyof typeof labels.status] ?? data.session.status}
  </span>
</h1>

<dl class="meta">
  <div><dt>{labels.sessions.phase}</dt><dd>{labels.phase[data.session.phase as keyof typeof labels.phase] ?? data.session.phase}</dd></div>
  <div><dt>{labels.sessions.case}</dt><dd>{data.session.caseId}</dd></div>
  <div><dt>{labels.sessions.started}</dt><dd>{formatDate(data.session.startedAt)}</dd></div>
  <div><dt>{labels.sessions.events}</dt><dd>{data.session.eventCount}</dd></div>
</dl>

{#if !data.configApproved}
  <aside class="warning">
    <strong>{labels.configWarning.title}</strong>
    <p>{labels.configWarning.body}</p>
    <p class="pending">{labels.configWarning.pending}: {data.pendingKeys.join(', ')}</p>
  </aside>
{/if}

{#if data.session.status === 'incomplete'}
  <section class="reason">
    <label>
      {labels.session.incompleteReason}
      <input bind:value={reason} placeholder="abandono_participante" />
    </label>
    <button onclick={saveReason} disabled={saving}>
      {labels.session.saveReason}
    </button>
    {#if saved}<span class="ok">Guardado</span>{/if}
  </section>
{/if}

<section>
  <h2>{labels.session.metrics}</h2>
  {#if data.metrics.length === 0}
    <p class="muted">{labels.session.noMetrics}</p>
  {:else}
    {#each grouped as [indicator, metrics] (indicator)}
      <div class="indicator">
        <h3>{indicatorLabel(indicator)}</h3>
        <table>
          <tbody>
            {#each metrics as metric (metric.id)}
              <tr>
                <td class="metric-name">{metricLabel(metric.metric)}</td>
                <td class="metric-value" class:not-evaluable={metric.valueType === 'not_evaluable'}>
                  {formatValue(metric)}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/each}
  {/if}
</section>

<section>
  <h2>{labels.session.timeline}</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>{labels.sessions.started}</th>
        <th>Escena</th>
        <th>Procedimiento</th>
        <th>Acción</th>
        <th>Resultado</th>
      </tr>
    </thead>
    <tbody>
      {#each data.events as event (event.eventId)}
        <tr>
          <td>{event.eventId}</td>
          <td class="mono">{formatDate(event.occurredAt)}</td>
          <td>{labels.scene[event.scene as keyof typeof labels.scene] ?? event.scene}</td>
          <td class="mono">{event.procedure}</td>
          <td class="mono">{event.action}</td>
          <td class="mono">{event.outcome}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</section>

<style>
  .back {
    display: inline-block;
    font-size: 0.875rem;
    margin-bottom: 1rem;
  }
  h1 {
    font-size: 1.3rem;
    margin: 0 0 1rem;
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  h2 {
    font-size: 1rem;
    margin: 2rem 0 0.9rem;
  }
  h3 {
    font-size: 0.9rem;
    margin: 0 0 0.4rem;
    color: var(--muted);
    font-weight: 600;
  }
  .meta {
    display: flex;
    gap: 2rem;
    flex-wrap: wrap;
    margin: 0 0 1.5rem;
  }
  .meta div {
    display: grid;
    gap: 0.15rem;
  }
  .meta dt {
    font-size: 0.75rem;
    color: var(--muted);
  }
  .meta dd {
    margin: 0;
    font-size: 0.9rem;
  }
  .badge {
    font-size: 0.75rem;
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--border);
    font-weight: 400;
  }
  .badge.complete {
    color: #1a7f37;
  }
  .badge.incomplete {
    color: #b45309;
  }
  .warning {
    background: var(--warn-bg);
    border: 1px solid var(--warn-border);
    border-radius: 8px;
    padding: 0.8rem 1rem;
    font-size: 0.875rem;
    margin-bottom: 1.5rem;
  }
  .warning p {
    margin: 0.35rem 0 0;
  }
  .pending {
    font-family: ui-monospace, monospace;
    font-size: 0.78rem;
  }
  .reason {
    display: flex;
    align-items: end;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }
  .reason label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .reason input {
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font: inherit;
    background: transparent;
    color: inherit;
  }
  .reason button {
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .ok {
    font-size: 0.8rem;
    color: #1a7f37;
  }
  .indicator {
    margin-bottom: 1.1rem;
  }
  .indicator table {
    font-size: 0.85rem;
  }
  .metric-name {
    width: 60%;
  }
  .metric-value {
    font-variant-numeric: tabular-nums;
  }
  .not-evaluable {
    color: var(--muted);
    font-style: italic;
  }
  .mono {
    font-family: ui-monospace, monospace;
    font-size: 0.8rem;
  }
  .muted {
    color: var(--muted);
  }
</style>
