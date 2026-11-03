<script lang="ts">
  import { labels } from '#lib/labels';

  let username = $state('');
  let password = $state('');
  let error = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    error = false;
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      error = true;
      return;
    }
    location.href = '/sessions';
  }
</script>

<svelte:head><title>{labels.login.title}</title></svelte:head>

<section class="login">
  <h1>{labels.login.title}</h1>
  <form onsubmit={submit}>
    <label>
      {labels.login.username}
      <input bind:value={username} autocomplete="username" required />
    </label>
    <label>
      {labels.login.password}
      <input type="password" bind:value={password} autocomplete="current-password" required />
    </label>
    {#if error}<p class="error">{labels.login.error}</p>{/if}
    <button type="submit">{labels.login.submit}</button>
  </form>
</section>

<style>
  .login {
    max-width: 320px;
    margin: 3rem auto;
  }
  h1 {
    font-size: 1.25rem;
    margin-bottom: 1.25rem;
  }
  form {
    display: grid;
    gap: 0.9rem;
  }
  label {
    display: grid;
    gap: 0.3rem;
    font-size: 0.875rem;
  }
  input {
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font: inherit;
    background: transparent;
    color: inherit;
  }
  button {
    padding: 0.55rem;
    border: 0;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    font: inherit;
    cursor: pointer;
  }
  .error {
    color: #c0392b;
    font-size: 0.875rem;
    margin: 0;
  }
</style>
