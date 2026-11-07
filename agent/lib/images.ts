export const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

// The image types the tools accept, and the extension each is saved with in the sandbox.
export const IMAGE_EXTENSIONS: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

/** Downloads an https image as bytes. Throws a message the model can act on. */
export async function fetchImage(url: string, signal?: AbortSignal) {
    if (!url.startsWith("https://")) {
        throw new Error(`Only https image URLs are supported: ${url}`);
    }
    // 20s: product CDNs are fast, but a hung host shouldn't hold the tool call open.
    const res = await fetch(url, { signal: AbortSignal.any([AbortSignal.timeout(20_000), ...(signal ? [signal] : [])]) });
    if (!res.ok) {
        throw new Error(`Couldn't download ${url}: HTTP ${res.status}`);
    }
    // Content-Type can carry parameters, e.g. "image/png; charset=binary". Keep only the media type.
    const contentType = res.headers.get("content-type") ?? "";
    const [mediaTypePart] = contentType.split(";");
    const mediaType = mediaTypePart.trim();
    if (!Object.hasOwn(IMAGE_EXTENSIONS, mediaType)) {
        throw new Error(`${url} is ${mediaType || "not an image"}. Use a PNG, JPEG, or WebP.`);
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES) {
        throw new Error(`${url} is larger than 20 MB.`);
    }
    return { bytes, mediaType };
}

export function mediaTypeForPath(path: string) {
    if (path.endsWith(".png")) {
        return "image/png";
    }
    if (/\.jpe?g$/.test(path)) {
        return "image/jpeg";
    }
    if (path.endsWith(".webp")) {
        return "image/webp";
    }
    return null;
}
