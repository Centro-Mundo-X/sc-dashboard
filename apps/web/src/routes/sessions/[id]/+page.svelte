<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { labels, indicatorLabel, metricLabel } from '#lib/labels';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  type MetricRow = (typeof data.metrics)[number];

  let reason = $state('');
  let saving = $state(false);
  let saved = $state(false);

  // Seed the input once from the loaded session.
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

  /** Count of indicators where every metric produced a real value. */
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

  /** Visual tone for a metric value, so scanning the page is quick. */
  function tone(metric: MetricRow): string {
    if (metric.valueType === 'not_evaluable') return 'text-(--text-soft)';
    if (metric.valueType === 'boolean') return metric.valueBool ? 'text-signal-ok' : 'text-signal-danger';
    if (metric.valueType === 'ratio') {
      const value = metric.valueNumber ?? 0;
      return value >= 1 ? 'text-signal-ok' : value >= 0.5 ? 'text-signal-warn' : 'text-signal-danger';
    }
    return 'text-(--text)';
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

<a
  href="/sessions"
  class="text-soft mb-4 inline-flex items-center gap-1 text-[0.8rem] transition hover:text-(--text)"
>
  ← {labels.session.back}
</a>

<div class="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2">
  <h1 class="font-mono text-xl font-semibold tracking-tight">{data.session.participantCode}</h1>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.72rem] font-medium {data.session
      .status === 'complete'
      ? 'bg-signal-ok/10 text-signal-ok'
      : 'bg-signal-warn/15 text-signal-warn'}"
  >
    <span
      class="size-1.5 rounded-full {data.session.status === 'complete'
        ? 'bg-signal-ok'
        : 'bg-signal-warn'}"
    ></span>
    {labels.status[data.session.status as keyof typeof labels.status] ?? data.session.status}
  </span>
</div>

<dl class="mb-6 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
  <div>
    <dt class="text-soft text-[0.68rem] font-medium tracking-wide uppercase">{labels.sessions.phase}</dt>
    <dd class="mt-0.5 text-sm">{labels.phase[data.session.phase as keyof typeof labels.phase] ?? data.session.phase}</dd>
  </div>
  <div>
    <dt class="text-soft text-[0.68rem] font-medium tracking-wide uppercase">{labels.sessions.case}</dt>
    <dd class="mt-0.5 font-mono text-[0.8rem]">{data.session.caseId}</dd>
  </div>
  <div>
    <dt class="text-soft text-[0.68rem] font-medium tracking-wide uppercase">{labels.sessions.started}</dt>
    <dd class="mt-0.5 text-sm">{formatDate(data.session.startedAt)}</dd>
  </div>
  <div>
    <dt class="text-soft text-[0.68rem] font-medium tracking-wide uppercase">Indicadores</dt>
    <dd class="mt-0.5 text-sm">
      <span class="text-signal-ok">{evaluated}</span>
      <span class="text-soft">/ {grouped.length}</span>
    </dd>
  </div>
</dl>

{#if !data.configApproved}
  <aside
    class="mb-6 rounded-xl border border-signal-warn/40 bg-signal-warn-bg px-4 py-3.5 dark:bg-signal-warn/10"
  >
    <div class="flex items-start gap-3">
      <span class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-signal-warn/20 text-[0.7rem] text-signal-warn">
        !
      </span>
      <div class="min-w-0">
        <p class="text-[0.85rem] font-semibold text-(--text)">{labels.configWarning.title}</p>
        <p class="mt-0.5 text-[0.8rem] text-(--text-soft)">{labels.configWarning.body}</p>
        <p class="mt-2 font-mono text-[0.7rem] break-words text-(--text-soft)">
          {labels.configWarning.pending}: {data.pendingKeys.join(' · ')}
        </p>
      </div>
    </div>
  </aside>
{/if}

{#if data.session.status === 'incomplete'}
  <section class="panel mb-6 flex flex-wrap items-end gap-3 p-4">
    <label class="grid flex-1 gap-1.5">
      <span class="text-soft text-[0.7rem] font-medium tracking-wide uppercase">
        {labels.session.incompleteReason}
      </span>
      <input
        bind:value={reason}
        placeholder="participant_abandoned"
        class="rounded-lg border border-(--hairline) bg-(--surface) px-3 py-2 text-sm outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20"
      />
    </label>
    <button
      onclick={saveReason}
      disabled={saving}
      class="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-700 disabled:opacity-50"
    >
      {labels.session.saveReason}
    </button>
    {#if saved}<span class="text-signal-ok text-[0.8rem]">Guardado</span>{/if}
  </section>
{/if}

<h2 class="mb-3 text-[0.95rem] font-semibold tracking-tight">{labels.session.metrics}</h2>

{#if data.metrics.length === 0}
  <div class="panel grid place-items-center px-6 py-12">
    <p class="text-soft text-sm">{labels.session.noMetrics}</p>
  </div>
{:else}
  <div class="mb-10 grid gap-3 sm:grid-cols-2">
    {#each grouped as [indicator, metrics] (indicator)}
      <div class="panel px-4 py-3.5">
        <h3 class="mb-2.5 text-[0.8rem] font-semibold tracking-tight">{indicatorLabel(indicator)}</h3>
        <dl class="grid gap-1.5">
          {#each metrics as metric (metric.id)}
            <div class="flex items-baseline justify-between gap-3">
              <dt class="text-soft text-[0.78rem]">{metricLabel(metric.metric)}</dt>
              <dd
                class="text-right text-[0.82rem] font-medium {tone(metric)}"
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

<h2 class="mb-3 text-[0.95rem] font-semibold tracking-tight">{labels.session.timeline}</h2>

<div class="panel overflow-hidden">
  <div class="max-h-[32rem] overflow-y-auto">
    <table class="w-full border-collapse text-sm">
      <thead class="sticky top-0 z-10 bg-(--panel)">
        <tr class="border-b border-(--hairline)">
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">#</th>
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">Hora</th>
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">Escena</th>
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">Procedimiento</th>
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">Acción</th>
          <th class="px-3 py-2 text-left text-[0.68rem] font-semibold tracking-wide text-(--text-soft) uppercase">Resultado</th>
        </tr>
      </thead>
      <tbody>
        {#each data.events as event (event.eventId)}
          <tr class="border-b border-(--hairline) last:border-0 hover:bg-(--hover)">
            <td class="px-3 py-1.5 font-mono text-[0.72rem] text-(--text-soft)">{event.eventId}</td>
            <td class="px-3 py-1.5 font-mono text-[0.72rem] text-(--text-soft)">{formatDate(event.occurredAt)}</td>
            <td class="px-3 py-1.5 text-[0.78rem]">
              {labels.scene[event.scene as keyof typeof labels.scene] ?? event.scene}
            </td>
            <td class="px-3 py-1.5 font-mono text-[0.72rem] text-(--text-soft)">{event.procedure}</td>
            <td class="px-3 py-1.5 font-mono text-[0.72rem]">{event.action}</td>
            <td class="px-3 py-1.5">
              <span
                class="font-mono text-[0.72rem] {event.outcome === 'corrected'
                  ? 'text-signal-warn'
                  : event.outcome === 'omitted'
                    ? 'text-signal-danger'
                    : 'text-(--text-soft)'}"
              >
                {event.outcome}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>
