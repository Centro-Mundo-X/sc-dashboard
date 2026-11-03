<script lang="ts">
  import { labels } from '#lib/labels';

  interface Props {
    participant: string;
    status: string;
  }

  let { participant, status }: Props = $props();
</script>

<form method="GET" class="mb-4 flex flex-wrap items-end gap-2 border-y border-(--rule) py-3">
  <label class="grid gap-1">
    <span class="text-faint text-[0.65rem] tracking-wider uppercase">
      {labels.sessions.filterParticipant}
    </span>
    <input name="participant" value={participant} placeholder="P01" class="field w-28" />
  </label>

  <label class="grid gap-1">
    <span class="text-faint text-[0.65rem] tracking-wider uppercase">
      {labels.sessions.filterStatus}
    </span>
    <select name="status" value={status} class="field w-32">
      <option value="">{labels.sessions.all}</option>
      <option value="complete">{labels.status.complete}</option>
      <option value="incomplete">{labels.status.incomplete}</option>
    </select>
  </label>

  <button
    type="submit"
    class="border border-(--hairline) bg-(--panel) px-3 py-1.5 text-[0.75rem] font-medium transition hover:bg-(--hover)"
  >
    {labels.filter.submit}
  </button>
</form>
