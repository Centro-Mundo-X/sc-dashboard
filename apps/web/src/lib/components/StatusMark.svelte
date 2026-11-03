<script lang="ts">
  import { labels } from '#lib/labels';

  interface Props {
    status: string;
    /** `bar` draws the short vertical mark used inside table rows. */
    withBar?: boolean;
  }

  let { status, withBar = false }: Props = $props();

  const label = $derived(labels.status[status as keyof typeof labels.status] ?? status);
  const complete = $derived(status === 'complete');
  const text = $derived(complete ? 'text-signal-ok' : 'text-signal-warn');
  const bar = $derived(complete ? 'bg-signal-ok' : 'bg-signal-warn');
</script>

<span class="inline-flex items-center gap-1.5 text-[0.75rem] font-medium {text}">
  {#if withBar}
    <span class="h-3 w-0.5 {bar}"></span>
  {/if}
  {label}
</span>
