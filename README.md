# Days since Current Concept posted

A one-page site that counts the days since [@currentconcept](https://www.youtube.com/@currentconcept)
last posted a full video. Shorts are excluded.

## How it refreshes

`.github/workflows/update.yml` runs once a day, plus on every push, plus whenever
you trigger it by hand. It runs `scripts/update.mjs`, which:

- reads the channel's RSS feed (no API key, no rate limits worth worrying about),
- checks each video newest-first to see whether it's a Short,
- writes the newest non-Short one into `data.json` and commits it if it changed.

The Shorts check works because `youtube.com/shorts/<id>` returns `200` for a real
Short but redirects to `/watch` for a normal video. It's a trick rather than an
API, so if YouTube changes that behaviour the script will throw instead of writing
bad data, and the workflow run will go red. If that happens, the alternative is the
YouTube Data API v3 (`videos.list?part=contentDetails`) and a duration check —
that needs a key, which is why it isn't the default here.

The page itself just reads `data.json` and does the subtraction in the browser, so
the number is correct even on a day the workflow hasn't run.

## Changing the channel

`CHANNEL_ID` at the top of `scripts/update.mjs`, and `CHANNEL_URL` in `index.html`.
