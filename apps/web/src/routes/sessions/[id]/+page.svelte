<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { labels, indicatorLabel, metricLabel, descriptionOf, INDICATOR_SCENE } from '#lib/labels';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  type MetricRow = (typeof data.metrics)[number];

  /**
   * Duration per scene, from the session's own timestamps. A scene with no
   * `scene_ended` event is still running or was interrupted, and reports null
   * rather than a misleading zero.
   */
  const sceneDurations = $derived.by(() => {
    const durations = new Map<string, number | null>();

    for (const scene of ['vital_signs', 'x_ray', 'results_delivery'] as const) {
      const own = data.events.filter((e) => e.scene === scene);
      const started = own.find((e) => e.action === 'scene_started');
      const ended = own.findLast((e) => e.action === 'scene_ended');

      if (!started) continue;
      if (!ended) {
        durations.set(scene, null);
        continue;
      }
      durations.set(scene, Date.parse(ended.occurredAt) - Date.parse(started.occurredAt));
    }

    return durations;
  });

  /** "4m 12s", or "en curso" when the scene did not close. */
  function duration(ms: number | null | undefined): string {
    if (ms === null) return 'en curso';
    if (ms === undefined) return '';
    const total = Math.round(ms / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }
  let reason = $state('');
  let saving = $state(false);
  let saved = $state(false);

  $effect.pre(() => {
    reason = data.session.incompleteReason ?? '';
  });

  /** Indicators grouped by indicator id, in metric row order. */
  const byIndicator = $derived.by(() => {
    const map = new Map<string, MetricRow[]>();
    for (const metric of data.metrics) {
      const bucket = map.get(metric.indicator);
      if (bucket) bucket.push(metric);
      else map.set(metric.indicator, [metric]);
    }
    return map;
  });

  const SCENE_ORDER = ['vital_signs', 'x_ray', 'results_delivery', 'outside'] as const;

  /**
   * Metrics grouped by scene, then by indicator. The scene is the first
   * division because that is the order the participant lived it.
   */
  const byScene = $derived.by(() => {
    const scenes = new Map<string, Array<[string, MetricRow[]]>>();

    for (const [indicator, metrics] of byIndicator) {
      const scene = INDICATOR_SCENE[indicator] ?? 'outside';
      const list = scenes.get(scene) ?? [];
      list.push([indicator, metrics]);
      scenes.set(scene, list);
    }

    const ordered = SCENE_ORDER.filter((s) => scenes.has(s)).map(
      (s) => [s, scenes.get(s)!] as const,
    );

    return ordered.map(([scene, indicators]) => {
      const all = indicators.flatMap(([, ms]) => ms);
      return {
        scene,
        indicators,
        /** Indicators in this scene where every metric has a real value. */
        evaluated: indicators.filter(([, ms]) => ms.every((m) => m.valueType !== 'not_evaluable')).length,
        total: indicators.length,
        notEvaluable: all.filter((m) => m.valueType === 'not_evaluable').length,
      };
    });
  });

  const evaluated = $derived(
    [...byIndicator.values()].filter((ms) => ms.every((m) => m.valueType !== 'not_evaluable')).length,
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
      <span class="font-mono">{evaluated}/{byIndicator.size}</span>
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
  <div class="mb-6 grid gap-5">
    {#each byScene as scene (scene.scene)}
      <section>
        <div class="mb-1 flex items-baseline gap-2 border-b border-(--hairline) pb-1">
          <h3 class="text-[0.8125rem] font-semibold">{labels.scene[scene.scene]}</h3>
          <span class="text-faint text-[0.75rem]">{labels.sceneDescription[scene.scene]}</span>
          <span class="text-soft ml-1 font-mono text-[0.6875rem]">
            {duration(sceneDurations.get(scene.scene))}
          </span>
          <span class="ml-auto font-mono text-[0.6875rem]">
            <span class={scene.evaluated === scene.total ? 'text-signal-ok' : 'text-(--text)'}>
              {scene.evaluated}/{scene.total}
            </span>
            {#if scene.notEvaluable > 0}
              <span class="text-soft">
                · {scene.notEvaluable}
                {scene.notEvaluable === 1 ? 'sin evaluar' : 'sin evaluar'}
              </span>
            {/if}
          </span>
        </div>

        {#each scene.indicators as [indicator, metrics] (indicator)}
          <div
            class="grid gap-x-6 gap-y-1 border-b border-(--rule) py-1.5 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]"
          >
            <h4 class="text-soft text-[0.75rem] font-medium">{indicatorLabel(indicator)}</h4>
            <dl class="grid min-w-0 gap-0.5">
              {#each metrics as metric (metric.id)}
                <div class="group/metric relative flex min-w-0 items-baseline justify-between gap-4">
                  <dt
                    class="text-soft min-w-0 cursor-help truncate text-[0.75rem] decoration-dotted underline-offset-2 group-hover/metric:underline"
                    title={descriptionOf(metric.metric) ?? ''}
                  >
                    {metricLabel(metric.metric)}
                  </dt>
                  <dd
                    class="text-right font-mono text-[0.75rem] font-medium {metric.valueType ===
                    'not_evaluable'
                      ? 'text-faint'
                      : 'text-(--text)'}"
                    title={metric.notEvaluableReason ?? ''}
                  >
                    {display(metric)}
                  </dd>

                  {#if descriptionOf(metric.metric)}
                    <p
                      role="tooltip"
                      class="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-max max-w-md border border-(--hairline) bg-(--panel) px-2.5 py-1.5 text-[0.6875rem] leading-snug font-normal text-(--text) shadow-sm group-hover/metric:block"
                    >
                      {descriptionOf(metric.metric)}
                    </p>
                  {/if}
                </div>
              {/each}
            </dl>
          </div>
        {/each}
      </section>
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
