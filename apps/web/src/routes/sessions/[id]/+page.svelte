<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { labels, INDICATOR_SCENE } from '#lib/labels';
  import { dateTime } from '#lib/format';
  import { INDICATOR_ORDER, SCENE_ORDER, allEvaluated, type MetricRow } from '#lib/metrics';
  import Notice from '#lib/components/Notice.svelte';
  import StatusMark from '#lib/components/StatusMark.svelte';
  import Field from '#lib/components/Field.svelte';
  import SceneMetrics from '#lib/components/SceneMetrics.svelte';
  import EventTimeline from '#lib/components/EventTimeline.svelte';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  /**
   * Duration per scene, from the session's own timestamps. A scene with no
   * `scene_ended` event is still running or was interrupted, and reports null
   * rather than a misleading zero.
   */
  const sceneDurations = $derived.by(() => {
    const durations = new Map<string, number | null>();

    for (const scene of SCENE_ORDER) {
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

  /** Metrics grouped by indicator, in the order of the metric tables. */
  const byIndicator = $derived.by(() => {
    const map = new Map<string, MetricRow[]>();
    for (const metric of data.metrics) {
      const bucket = map.get(metric.indicator);
      if (bucket) bucket.push(metric);
      else map.set(metric.indicator, [metric]);
    }

    const rank = (id: string) => {
      const index = INDICATOR_ORDER.indexOf(id as (typeof INDICATOR_ORDER)[number]);
      return index === -1 ? INDICATOR_ORDER.length : index;
    };

    return [...map.entries()].sort(([a], [b]) => rank(a) - rank(b));
  });

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

    return SCENE_ORDER.filter((scene) => scenes.has(scene)).map((scene) => ({
      scene,
      indicators: scenes.get(scene)!,
    }));
  });

  const evaluated = $derived(byIndicator.filter(([, ms]) => allEvaluated(ms)).length);

  let reason = $state('');
  let saving = $state(false);
  let saved = $state(false);

  $effect.pre(() => {
    reason = data.session.incompleteReason ?? '';
  });

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
  <StatusMark status={data.session.status} />
  <span class="text-faint ml-auto font-mono text-[0.6875rem]">{data.session.clientId}</span>
</div>

<dl class="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
  <Field term={labels.sessions.phase} value={labels.phase[data.session.phase as keyof typeof labels.phase] ?? data.session.phase} />
  <Field term={labels.sessions.case} value={data.caseLabel ?? data.session.caseId} />
  <Field term={labels.sessions.started} value={dateTime(data.session.startedAt)} />
  <Field term={labels.session.evaluatedIndicators} value="{evaluated}/{byIndicator.length}" mono />
</dl>

{#if data.caseMissing.length > 0}
  <Notice
    tone="danger"
    title="{labels.sessions.case} {data.caseLabel ?? data.session.caseId} {labels.caseWarning.title}"
    body={labels.caseWarning.body}
    detail={data.caseMissing}
  />
{/if}

{#if !data.configApproved}
  <Notice
    title={labels.configWarning.title}
    body={labels.configWarning.body}
    detail={data.pendingKeys}
  />
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
    {#if saved}<span class="text-signal-ok text-[0.75rem]">{labels.session.saved}</span>{/if}
  </section>
{/if}

<h2 class="label mb-2">{labels.session.metrics}</h2>

{#if data.metrics.length === 0}
  <p class="text-faint py-8 text-center text-[0.8125rem]">{labels.session.noMetrics}</p>
{:else}
  <div class="mb-6 grid gap-5">
    {#each byScene as scene (scene.scene)}
      <SceneMetrics
        scene={scene.scene}
        indicators={scene.indicators}
        durationMs={sceneDurations.get(scene.scene)}
      />
    {/each}
  </div>
{/if}

<h2 class="label mb-2">{labels.session.timeline}</h2>

<EventTimeline events={data.events} />
