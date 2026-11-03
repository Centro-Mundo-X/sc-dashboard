<script lang="ts">
  /**
   * One metric row: label, value and, on hover, what the metric measures.
   * The description comes from the label catalogue, so a metric cannot exist
   * without one.
   */
  import { metricLabel, descriptionOf, labels } from '#lib/labels';
  import type { MetricRow } from '#lib/metrics';

  interface Props {
    metric: MetricRow;
  }

  let { metric }: Props = $props();

  const description = $derived(descriptionOf(metric.metric));

  const display = $derived.by(() => {
    if (metric.valueType === 'not_evaluable') return '—';
    if (metric.valueType === 'boolean') return metric.valueBool ? labels.value.yes : labels.value.no;
    if (metric.valueType === 'ratio') return `${Math.round((metric.valueNumber ?? 0) * 100)}%`;
    if (metric.valueType === 'number') {
      const value = metric.valueNumber ?? 0;
      return metric.metric.endsWith('_ms') ? `${value} ${labels.value.ms}` : String(value);
    }
    return metric.valueText ?? '—';
  });
</script>

<div class="group/metric relative flex min-w-0 items-baseline justify-between gap-4">
  <dt
    class="text-soft min-w-0 cursor-help truncate text-[0.75rem] decoration-dotted underline-offset-2 group-hover/metric:underline"
    title={description ?? ''}
  >
    {metricLabel(metric.metric)}
  </dt>
  <dd
    class="text-right font-mono text-[0.75rem] font-medium {metric.valueType === 'not_evaluable'
      ? 'text-faint'
      : 'text-(--text)'}"
    title={metric.notEvaluableReason ?? ''}
  >
    {display}
  </dd>

  {#if description}
    <p
      role="tooltip"
      class="pointer-events-none absolute top-full left-0 z-20 mt-1 hidden w-max max-w-md border border-(--hairline) bg-(--panel) px-2.5 py-1.5 text-[0.6875rem] leading-snug font-normal text-(--text) shadow-sm group-hover/metric:block"
    >
      {description}
    </p>
  {/if}
</div>
