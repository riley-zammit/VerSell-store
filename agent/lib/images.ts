const MAX_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Downloads an https image as bytes. Throws a message the model can act on. */
export async function fetchImage(url: string, signal?: AbortSignal) {
  if (!url.startsWith("https://")) throw new Error(`Only https image URLs are supported: ${url}`);
  // 20s: product CDNs are fast, but a hung host shouldn't hold the tool call open.
  const res = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]) });
  if (!res.ok) throw new Error(`Couldn't download ${url}: HTTP ${res.status}`);
  const mediaType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!IMAGE_TYPES.includes(mediaType)) throw new Error(`${url} is ${mediaType || "not an image"}. Use a PNG, JPEG, or WebP.`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) throw new Error(`${url} is larger than 20 MB.`);
  return { bytes, mediaType };
}

export const mediaTypeForPath = (path: string) =>
  path.endsWith(".png") ? "image/png" : /\.jpe?g$/.test(path) ? "image/jpeg" : path.endsWith(".webp") ? "image/webp" : null;
