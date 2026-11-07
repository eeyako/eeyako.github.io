import { writeFile } from 'node:fs/promises';

const SOURCE_URL = 'https://openusd.org/release/api/annotated.html';
const OUTPUT_PATH = new URL('../pxr-index.json', import.meta.url);

function decodeEntities(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

const res = await fetch(SOURCE_URL);
if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
}

const html = await res.text();
const linkPattern = /<a\b[^>]*class="el"[^>]*>([^<]+)<\/a>/g;

const entries = {};
for (const match of html.matchAll(linkPattern)) {
    const href = match[0].match(/\bhref="([^"]+)"/);
    if (!href) {
        continue;
    }
    const name = decodeEntities(match[1].trim()).toLowerCase();
    if (!(name in entries)) {
        entries[name] = href[1];
    }
}

const sorted = Object.fromEntries(
    Object.entries(entries).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
);

const body = `{\n${Object.entries(sorted)
    .map(([name, href]) => `  ${JSON.stringify(name)}: ${JSON.stringify(href)}`)
    .join(',\n')}\n}\n`;

await writeFile(OUTPUT_PATH, body);
console.log(`Wrote ${Object.keys(sorted).length} entries to ${OUTPUT_PATH.pathname}`);
