// Keeps data.json up to date with every non-Short video this channel has
// posted, as far back as we've been watching.
//
// The RSS feed only carries the last 15 uploads, Shorts included, so history
// is built by accumulation: each run merges anything new into what's already
// in data.json, and nothing is ever dropped. Run it for a year and you have a
// year of gaps, even though any single fetch sees 15 entries.
//
// Shorts are filtered by asking for youtube.com/shorts/<id>: a real Short
// answers 200, a normal video redirects to /watch. Verdicts are cached in
// data.json so each video is only ever checked once.

import { readFile, writeFile } from "node:fs/promises";

const CHANNEL_ID = "UCW5i5rLbDiu9RhCEXj4BAZw"; // @currentconcept
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/125.0 Safari/537.36";

const unescapeXml = (s = "") =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

function parseFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .map(([, block]) => {
      const pick = (tag) =>
        (block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1];
      return {
        id: pick("yt:videoId"),
        title: unescapeXml(pick("title") || "").trim(),
        published: pick("published"),
      };
    })
    .filter((e) => e.id && e.published);
}

async function isShort(id) {
  const res = await fetch(`https://www.youtube.com/shorts/${id}`, {
    redirect: "manual",
    headers: { "user-agent": UA, "accept-language": "en-US,en;q=0.9" },
  });
  if (res.status === 200) return true;
  if (res.status >= 300 && res.status < 400) return false;
  throw new Error(`unexpected status ${res.status} for ${id}`);
}

let existing = { videos: [], shorts: [] };
try {
  existing = JSON.parse(await readFile("data.json", "utf8"));
} catch {
  console.log("no usable data.json, starting fresh");
}

const videos = new Map((existing.videos || []).map((v) => [v.id, v]));
const shorts = new Set(existing.shorts || []);

const feedRes = await fetch(FEED, { headers: { "user-agent": UA } });
if (!feedRes.ok) throw new Error(`feed request failed: ${feedRes.status}`);

const entries = parseFeed(await feedRes.text());
if (!entries.length) throw new Error("no entries found in feed");

let added = 0;
for (const entry of entries) {
  if (shorts.has(entry.id)) continue;
  if (videos.has(entry.id)) {
    videos.set(entry.id, { ...videos.get(entry.id), title: entry.title });
    continue;
  }
  if (await isShort(entry.id)) {
    shorts.add(entry.id);
    console.log(`Short, ignoring: ${entry.title}`);
  } else {
    videos.set(entry.id, entry);
    added++;
    console.log(`new video: ${entry.title} (${entry.published})`);
  }
}

const sorted = [...videos.values()].sort(
  (a, b) => new Date(b.published) - new Date(a.published)
);
if (!sorted.length) throw new Error("every video in the feed looks like a Short");

await writeFile(
  "data.json",
  JSON.stringify(
    {
      checked: new Date().toISOString(),
      videos: sorted,
      shorts: [...shorts].slice(-200),
    },
    null,
    2
  ) + "\n"
);

console.log(
  `${sorted.length} videos on record (${added} new), latest ${sorted[0].published}`
);
