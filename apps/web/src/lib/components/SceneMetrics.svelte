<script lang="ts">
  /**
   * One scene: its indicator rows, the time it took and how many indicators
   * could be evaluated. A scene with a missing value shows the count so the
   * reader knows the gap is in the data, not in the display.
   */
  import { labels, indicatorLabel } from '#lib/labels';
  import { allEvaluated, type MetricRow } from '#lib/metrics';
  import { duration } from '#lib/format';
  import MetricRowView from './MetricRow.svelte';

  interface Props {
    scene: string;
    /** Indicator id paired with its metrics, already ordered. */
    indicators: ReadonlyArray<readonly [string, MetricRow[]]>;
    /** Milliseconds, or null when the scene never closed. */
    durationMs: number | null | undefined;
  }

  let { scene, indicators, durationMs }: Props = $props();

  const evaluated = $derived(indicators.filter(([, ms]) => allEvaluated(ms)).length);
  const total = $derived(indicators.length);
  const notEvaluable = $derived(
    indicators.flatMap(([, ms]) => ms).filter((m) => m.valueType === 'not_evaluable').length,
  );

  const sceneName = $derived(labels.scene[scene as keyof typeof labels.scene] ?? scene);
  const sceneDescription = $derived(
    labels.sceneDescription[scene as keyof typeof labels.sceneDescription],
  );
</script>

<section>
  <div class="mb-1 flex items-baseline gap-2 border-b border-(--hairline) pb-1">
    <h3 class="text-[0.8125rem] font-semibold">{sceneName}</h3>
    {#if sceneDescription}
      <span class="text-faint text-[0.75rem]">{sceneDescription}</span>
    {/if}
    <span class="text-soft ml-1 font-mono text-[0.6875rem]">
      {duration(durationMs, 'en curso')}
    </span>
    <span class="ml-auto font-mono text-[0.6875rem]">
      <span class={evaluated === total ? 'text-signal-ok' : 'text-(--text)'}>
        {evaluated}/{total}
      </span>
      {#if notEvaluable > 0}
        <span class="text-soft">· {notEvaluable} sin evaluar</span>
      {/if}
    </span>
  </div>

  {#each indicators as [indicator, metrics] (indicator)}
    <div
      class="grid gap-x-6 gap-y-1 border-b border-(--rule) py-1.5 sm:grid-cols-[minmax(0,190px)_minmax(0,1fr)]"
    >
      <h4 class="text-soft text-[0.75rem] font-medium">{indicatorLabel(indicator)}</h4>
      <dl class="grid min-w-0 gap-0.5">
        {#each metrics as metric (metric.id)}
          <MetricRowView {metric} />
        {/each}
      </dl>
    </div>
  {/each}
</section>
