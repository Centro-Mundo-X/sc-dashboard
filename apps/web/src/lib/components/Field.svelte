<script lang="ts">
  interface Props {
    /** Term above the value. Uppercase by the `label` utility. */
    term: string;
    value: string | number;
    mono?: boolean;
  }

  let { term, value, mono = false }: Props = $props();
</script>

<div>
  <dt class="label">{term}</dt>
  <dd class="mt-0.5">
    {#if mono}
      <span class="font-mono">{value}</span>
    {:else}
      {value}
    {/if}
  </dd>
</div>
