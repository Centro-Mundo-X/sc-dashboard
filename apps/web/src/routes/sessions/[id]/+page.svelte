<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { labels, indicatorLabel, metricLabel } from '#lib/labels';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  type MetricRow = (typeof data.metrics)[number];

  let reason = $state('');
  let saving = $state(false);
  let saved = $state(false);

  $effect.pre(() => {
    reason = data.session.incompleteReason ?? '';
  });

  const grouped = $derived.by(() => {
    const map = new Map<string, MetricRow[]>();
    for (const metric of data.metrics) {
      const bucket = map.get(metric.indicator);
      if (bucket) bucket.push(metric);
      else map.set(metric.indicator, [metric]);
    }
    return [...map.entries()];
  });

  const evaluated = $derived(
    grouped.filter(([, ms]) => ms.every((m) => m.valueType !== 'not_evaluable')).length,
  );

  function display(metric: MetricRow): string {
    if (metric.valueType === 'not_evaluable') return '—';
    if (metric.valueType === 'boolean') return metric.valueBool ? labels.value.yes : labels.value.no;
    if (metric.valueType === 'ratio') return `${Math.round((metric.valueNumber ?? 0) * 100)}%`;
    if (metric.valueType === 'number') {
      const value = metric.valueNumber ?? 0;
      return metric.metric.endsWith('_ms') ? `${value} ${labels.value.ms}` : String(value);
    }
    return metric.valueText ?? '—';
  }

  /** Failed checks are the only thing that gets colour. */
  function failed(metric: MetricRow): boolean {
    if (metric.valueType === 'boolean') return metric.valueBool === false;
    if (metric.valueType === 'ratio') return (metric.valueNumber ?? 0) < 1;
    return false;
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' });
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-VE', { hour12: false });
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

<a href="/sessions" class="text-soft mb-3 inline-block text-[0.75rem] hover:underline">
  ← {labels.session.back}
</a>

<div class="mb-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-(--hairline) pb-2">
  <h1 class="font-mono text-base font-semibold">{data.session.participantCode}</h1>
  <span
    class="text-[0.75rem] font-medium {data.session.status === 'complete'
      ? 'text-signal-ok'
      : 'text-signal-warn'}"
  >
    {labels.status[data.session.status as keyof typeof labels.status] ?? data.session.status}
  </span>
  <span class="text-faint ml-auto font-mono text-[0.6875rem]">{data.session.clientId}</span>
</div>

<dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
  <div>
    <dt class="label">{labels.sessions.phase}</dt>
    <dd class="mt-0.5">{labels.phase[data.session.phase as keyof typeof labels.phase] ?? data.session.phase}</dd>
  </div>
  <div>
    <dt class="label">{labels.sessions.case}</dt>
    <dd class="mt-0.5 font-mono text-[0.75rem]">{data.session.caseId}</dd>
  </div>
  <div>
    <dt class="label">{labels.sessions.started}</dt>
    <dd class="mt-0.5">{formatDate(data.session.startedAt)}</dd>
  </div>
  <div>
    <dt class="label">Indicadores evaluados</dt>
    <dd class="mt-0.5">
      <span class="font-mono">{evaluated}/{grouped.length}</span>
    </dd>
  </div>
</dl>

{#if !data.configApproved}
  <aside class="mb-4 border border-(--hairline) border-l-2 border-l-signal-warn bg-(--panel) px-3 py-2">
    <p class="text-[0.8125rem] font-semibold text-signal-warn">{labels.configWarning.title}</p>
    <p class="text-soft mt-0.5 text-[0.75rem]">{labels.configWarning.body}</p>
    <p class="text-faint mt-1 font-mono text-[0.6875rem] break-words">
      {data.pendingKeys.join(' · ')}
    </p>
  </aside>
{/if}

{#if data.session.status === 'incomplete'}
  <section class="mb-4 flex flex-wrap items-end gap-2 border border-(--hairline) bg-(--panel) px-3 py-2">
    <label class="grid flex-1 gap-1">
      <span class="label">{labels.session.incompleteReason}</span>
      <input bind:value={reason} placeholder="participant_abandoned" class="field" />
    </label>
    <button
      onclick={saveReason}
      disabled={saving}
      class="border border-(--hairline) px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-(--hover) disabled:opacity-50"
    >
      {labels.session.saveReason}
    </button>
    {#if saved}<span class="text-signal-ok text-[0.75rem]">Guardado</span>{/if}
  </section>
{/if}

<h2 class="label mb-2">{labels.session.metrics}</h2>

{#if data.metrics.length === 0}
  <p class="text-faint py-8 text-center text-[0.8125rem]">{labels.session.noMetrics}</p>
{:else}
  <div class="mb-6 border-t border-(--hairline)">
    {#each grouped as [indicator, metrics] (indicator)}
      <div class="grid gap-x-6 gap-y-1 border-b border-(--rule) py-2 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]">
        <h3 class="text-[0.75rem] font-semibold">{indicatorLabel(indicator)}</h3>
        <dl class="grid min-w-0 gap-0.5">
          {#each metrics as metric (metric.id)}
            <div class="flex min-w-0 items-baseline justify-between gap-4">
              <dt class="text-soft min-w-0 truncate text-[0.75rem]">{metricLabel(metric.metric)}</dt>
              <dd
                class="text-right font-mono text-[0.75rem] font-medium {failed(metric)
                  ? 'text-signal-danger'
                  : 'text-(--text)'}"
                title={metric.notEvaluableReason ?? ''}
              >
                {display(metric)}
              </dd>
            </div>
          {/each}
        </dl>
      </div>
    {/each}
  </div>
{/if}

<h2 class="label mb-2">{labels.session.timeline}</h2>

<div class="max-h-[26rem] overflow-y-auto border border-(--hairline) bg-(--panel)">
  <table class="w-full border-collapse">
    <thead class="sticky top-0 bg-(--panel)">
      <tr class="border-b border-(--hairline)">
        <th class="label px-2 py-1 text-left font-semibold">#</th>
        <th class="label px-2 py-1 text-left font-semibold">Hora</th>
        <th class="label px-2 py-1 text-left font-semibold">Escena</th>
        <th class="label px-2 py-1 text-left font-semibold">Procedimiento</th>
        <th class="label px-2 py-1 text-left font-semibold">Acción</th>
        <th class="label px-2 py-1 text-left font-semibold">Resultado</th>
      </tr>
    </thead>
    <tbody>
      {#each data.events as event (event.eventId)}
        <tr class="border-b border-(--rule) last:border-0 hover:bg-(--hover)">
          <td class="text-faint px-2 py-1 font-mono text-[0.6875rem]">{event.eventId}</td>
          <td class="text-faint px-2 py-1 font-mono text-[0.6875rem]">{formatTime(event.occurredAt)}</td>
          <td class="px-2 py-1 text-[0.75rem]">
            {labels.scene[event.scene as keyof typeof labels.scene] ?? event.scene}
          </td>
          <td class="text-soft px-2 py-1 font-mono text-[0.6875rem]">{event.procedure}</td>
          <td class="px-2 py-1 font-mono text-[0.6875rem]">{event.action}</td>
          <td class="px-2 py-1 font-mono text-[0.6875rem] {event.outcome === 'corrected'
            ? 'text-signal-warn'
            : event.outcome === 'omitted'
              ? 'text-signal-danger'
              : 'text-soft'}">
            {event.outcome}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
