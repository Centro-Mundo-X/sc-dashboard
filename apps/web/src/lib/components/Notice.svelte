<script lang="ts">
  interface Props {
    /** `warn` for provisional data, `danger` for something that blocks a metric. */
    tone?: 'warn' | 'danger';
    title: string;
    body: string;
    /** Optional detail line, rendered as code. */
    detail?: string | readonly string[];
  }

  let { tone = 'warn', title, body, detail }: Props = $props();

  const border = $derived(tone === 'danger' ? 'border-l-signal-danger' : 'border-l-signal-warn');
  const text = $derived(tone === 'danger' ? 'text-signal-danger' : 'text-signal-warn');

  const detailText = $derived(
    detail === undefined ? undefined : typeof detail === 'string' ? detail : detail.join(' · '),
  );
</script>

<aside class="mb-4 border border-(--hairline) border-l-2 {border} bg-(--panel) px-3 py-2">
  <p class="text-[0.8125rem] font-semibold {text}">{title}</p>
  <p class="text-soft mt-0.5 text-[0.75rem]">{body}</p>
  {#if detailText}
    <p class="text-faint mt-1 font-mono text-[0.6875rem] break-words">{detailText}</p>
  {/if}
</aside>
