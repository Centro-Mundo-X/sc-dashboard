<script lang="ts">
  import { labels } from '#lib/labels';
</script>

<svelte:head>
  <title>{labels.appName}</title>
</svelte:head>

<div class="shell">
  <header>
    <a href="/sessions"><strong>{labels.appName}</strong></a>
    <span class="subtitle">{labels.subtitle}</span>
  </header>
  <main>
    {@render children?.()}
  </main>
</div>

{#snippet children()}{/snippet}

<style>
  :global(:root) {
    color-scheme: light dark;
    font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
    --border: color-mix(in srgb, currentColor 15%, transparent);
    --muted: color-mix(in srgb, currentColor 60%, transparent);
    --warn-bg: #fff4d6;
    --warn-border: #e0a800;
  }

  :global(body) {
    margin: 0;
    background: #fbfbfd;
    color: #16181d;
  }

  @media (prefers-color-scheme: dark) {
    :global(body) {
      background: #14161a;
      color: #e8eaed;
    }
    :global(:root) {
      --warn-bg: #3a2f10;
      --warn-border: #a07d00;
    }
  }

  .shell {
    max-width: 980px;
    margin: 0 auto;
    padding: 0 1.25rem 3rem;
  }

  header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 1.5rem 0 1.25rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.5rem;
  }

  header a {
    color: inherit;
    text-decoration: none;
    font-size: 1.05rem;
  }

  .subtitle {
    color: var(--muted);
    font-size: 0.875rem;
  }

  :global(a) {
    color: #2563eb;
  }

  :global(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }

  :global(th) {
    text-align: left;
    font-weight: 600;
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--border);
    white-space: nowrap;
  }

  :global(td) {
    padding: 0.5rem 0.6rem;
    border-bottom: 1px solid var(--border);
  }

  :global(tbody tr:hover) {
    background: color-mix(in srgb, currentColor 4%, transparent);
  }
</style>
