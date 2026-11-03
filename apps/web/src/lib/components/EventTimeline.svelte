<script lang="ts">
  /**
   * The raw event log. Not a metric: it is what the headset recorded, shown so
   * a result can be traced back to the events that produced it.
   */
  import { labels } from '#lib/labels';
  import { clockTime } from '#lib/format';
  import type { SessionEventRow } from '#lib/metrics';

  interface Props {
    events: readonly SessionEventRow[];
  }

  let { events }: Props = $props();

  /** Colour marks a departure from a plain completed action, nothing else. */
  function outcomeClass(outcome: string): string {
    if (outcome === 'corrected') return 'text-signal-warn';
    if (outcome === 'omitted') return 'text-signal-danger';
    return 'text-soft';
  }
</script>

<div class="max-h-[26rem] overflow-y-auto border border-(--hairline) bg-(--panel)">
  <table class="w-full border-collapse">
    <thead class="sticky top-0 bg-(--panel)">
      <tr class="border-b border-(--hairline)">
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.index}</th>
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.time}</th>
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.scene}</th>
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.procedure}</th>
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.action}</th>
        <th class="label px-2 py-1 text-left font-semibold">{labels.timeline.outcome}</th>
      </tr>
    </thead>
    <tbody>
      {#each events as event (event.eventId)}
        <tr class="border-b border-(--rule) last:border-0 hover:bg-(--hover)">
          <td class="text-faint px-2 py-1 font-mono text-[0.6875rem]">{event.eventId}</td>
          <td class="text-faint px-2 py-1 font-mono text-[0.6875rem]">
            {clockTime(event.occurredAt)}
          </td>
          <td class="px-2 py-1 text-[0.75rem]">
            {labels.scene[event.scene as keyof typeof labels.scene] ?? event.scene}
          </td>
          <td class="text-soft px-2 py-1 font-mono text-[0.6875rem]">{event.procedure}</td>
          <td class="px-2 py-1 font-mono text-[0.6875rem]">{event.action}</td>
          <td class="px-2 py-1 font-mono text-[0.6875rem] {outcomeClass(event.outcome)}">
            {event.outcome}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
