<script lang="ts">
  /** The session list. One row per session, ordered newest first by the query. */
  import { labels } from '#lib/labels';
  import { dateTime, duration } from '#lib/format';
  import StatusMark from './StatusMark.svelte';

  interface SessionRow {
    id: number;
    participantCode: string;
    phase: string;
    caseId: string;
    caseLabel: string | null;
    status: string;
    startedAt: string;
    durationMs: number | null;
    eventCount: number;
    invalidEventCount: number;
  }

  interface Props {
    sessions: readonly SessionRow[];
  }

  let { sessions }: Props = $props();
</script>

{#if sessions.length === 0}
  <p class="text-faint py-10 text-center text-[0.8125rem]">{labels.sessions.empty}</p>
{:else}
  <table class="w-full border-collapse">
    <thead>
      <tr class="border-b border-(--hairline)">
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.participant}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.phase}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.case}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.status}</th>
        <th class="label px-2 py-1.5 text-left font-semibold">{labels.sessions.started}</th>
        <th class="label px-2 py-1.5 text-right font-semibold">{labels.sessions.duration}</th>
        <th class="label px-2 py-1.5 text-right font-semibold">{labels.sessions.events}</th>
      </tr>
    </thead>
    <tbody>
      {#each sessions as session (session.id)}
        <tr class="border-b border-(--rule) hover:bg-(--hover)">
          <td class="px-2 py-2">
            <a
              href="/sessions/{session.id}"
              class="font-mono text-[0.8125rem] font-medium underline-offset-2 hover:underline"
            >
              {session.participantCode}
            </a>
          </td>
          <td class="text-soft px-2 py-2">
            {labels.phase[session.phase as keyof typeof labels.phase] ?? session.phase}
          </td>
          <td class="text-soft px-2 py-2">{session.caseLabel ?? session.caseId}</td>
          <td class="px-2 py-2">
            <StatusMark status={session.status} withBar />
          </td>
          <td class="text-soft px-2 py-2">{dateTime(session.startedAt)}</td>
          <td class="text-soft px-2 py-2 text-right">{duration(session.durationMs)}</td>
          <td class="px-2 py-2 text-right">
            {session.eventCount}
            {#if session.invalidEventCount > 0}
              <span
                class="ml-1 text-[0.6875rem] text-signal-warn"
                title={labels.sessions.invalidEvents}
              >
                +{session.invalidEventCount}
              </span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
