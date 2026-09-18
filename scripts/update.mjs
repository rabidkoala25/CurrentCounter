// Finds the newest non-Short video on the channel and writes data.json.
//
// How Shorts get filtered: the RSS feed doesn't say how long a video is, but
// youtube.com/shorts/<id> returns 200 for an actual Short and redirects (303)
// to /watch for a normal video. One cheap request per video, no API key.

import { writeFile } from "node:fs/promises";

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
    .filter((e) => e.id && e.published)
    .sort((a, b) => new Date(b.published) - new Date(a.published));
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

const feedRes = await fetch(FEED, { headers: { "user-agent": UA } });
if (!feedRes.ok) throw new Error(`feed request failed: ${feedRes.status}`);

const entries = parseFeed(await feedRes.text());
if (!entries.length) throw new Error("no entries found in feed");

let latest = null;
for (const entry of entries) {
  if (!(await isShort(entry.id))) {
    latest = entry;
    break;
  }
  console.log(`skipping Short: ${entry.title}`);
}
if (!latest) throw new Error("every video in the feed looks like a Short");

const data = {
  video: latest,
  checked: new Date().toISOString(),
};

await writeFile("data.json", JSON.stringify(data, null, 2) + "\n");
console.log(`latest full video: ${latest.title} (${latest.published})`);
