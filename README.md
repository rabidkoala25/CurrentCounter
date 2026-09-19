# Days since Current Concept posted

A one-page site that counts the days since [@currentconcept](https://www.youtube.com/@currentconcept)
last posted a full video, and puts that number in context: how it compares to
every gap on record, the median and average gap, the longest and shortest, a
bar chart of the history, and a log of recent uploads. Shorts are excluded
throughout.

## Setup

1. Create a new **public** repository on GitHub.
2. Push these files, or upload them. **If you drag the folder into the GitHub
   web uploader, `.github/` will be silently skipped** — dot-folders don't
   survive drag-and-drop. Check afterwards, and if the workflow is missing, use
   **Add file → Create new file** and type `.github/workflows/update.yml` as the
   name to recreate it.
3. **Settings → Pages → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
4. **Actions → "Update video data" → Run workflow.** The workflow also runs on
   every push, so it has usually gone already by the time you get there.

The site is then at `https://<your-username>.github.io/<repo-name>/`.

## How the history works

YouTube's RSS feed only carries the last 15 uploads, so the statistics can't be
complete on day one. Instead `scripts/update.mjs` accumulates: each run merges
anything new into `data.json` and never removes anything. The first run gives
you however many non-Shorts are in the current feed; after a year of daily runs
you have a year of gaps, and the chart and averages get steadily more
meaningful.

`data.json` holds:

- `videos` — every non-Short seen so far, newest first, with id, title and publish date
- `shorts` — ids already identified as Shorts, so they're never re-checked
- `checked` — when the workflow last ran

The Shorts test is `youtube.com/shorts/<id>`: a real Short answers `200`, a
normal video redirects to `/watch`. No API key, one request per video, and each
video is only ever tested once. It's a behaviour rather than a documented API,
so if YouTube changes it the script throws instead of writing bad data and the
workflow run goes red. The fallback would be the YouTube Data API v3
(`videos.list?part=contentDetails`) and a duration check, which needs a key.

All the statistics are computed in the browser from `data.json`, so the day
count is right even on a day the workflow hasn't run.

### Seeding more history

If you want real numbers immediately, you can hand-write older entries into
`videos` in `data.json` — only `id`, `title` and `published` (ISO date) are
used, and the script will merge around them rather than overwrite them.

## Changing the channel

`CHANNEL_ID` at the top of `scripts/update.mjs`, and `CHANNEL_URL` in
`index.html`. Empty the `videos` and `shorts` arrays in `data.json` when you do,
or you'll be mixing two channels' histories.
