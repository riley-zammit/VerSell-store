import { readFile } from "node:fs/promises";
import path from "node:path";

// A route handler, not a page, so the standalone deck skips the root layout (header, cart, chat).
export async function GET() {
    const html = await readArchitectureHtml();

    return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
    });
}

// Cached so the file read happens at build and the route prerenders as static.
async function readArchitectureHtml() {
    "use cache";
    return readFile(path.join(process.cwd(), "pres/architecture.html"), "utf8");
}
