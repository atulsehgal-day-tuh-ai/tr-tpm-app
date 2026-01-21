import { SourceMapConsumer } from "source-map";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function main() {
  const [fileUrl, lineStr, colStr] = process.argv.slice(2);
  if (!fileUrl || !lineStr || !colStr) {
    console.error("Usage: node scripts/map-sourcemap.mjs <fileUrl> <line> <column>");
    process.exit(1);
  }
  const line = Number(lineStr);
  const column = Number(colStr);
  if (!Number.isFinite(line) || !Number.isFinite(column)) {
    throw new Error("line/column must be numbers");
  }

  const mapUrl = `${fileUrl}.map`;
  const rawMap = await fetchText(mapUrl);
  const map = JSON.parse(rawMap);

  await SourceMapConsumer.with(map, null, (consumer) => {
    const pos = consumer.originalPositionFor({ line, column });
    console.log(JSON.stringify({ input: { fileUrl, line, column }, mapUrl, pos }, null, 2));
  });
}

await main();

