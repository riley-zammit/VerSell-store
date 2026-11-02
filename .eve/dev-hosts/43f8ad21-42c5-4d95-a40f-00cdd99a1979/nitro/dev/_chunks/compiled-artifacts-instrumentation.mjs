import { fileURLToPath as __eveFileURLToPath } from "node:url";
import { dirname as __eveDirname } from "node:path";
const __filename = __eveFileURLToPath(import.meta.url);
__eveDirname(__filename);
import { finalizeInstrumentationProviders, seedInstrumentationProviders, shutdownInstrumentationProviders } from "file:///Users/rileyzammit/Documents/storefronts/VerSell-store/node_modules/eve/dist/src/instrumentation/providers.js";
// .eve/dev-hosts/43f8ad21-42c5-4d95-a40f-00cdd99a1979/artifacts/compiled-artifacts-instrumentation.mjs
seedInstrumentationProviders();
finalizeInstrumentationProviders({ serviceName: "versell" });
function installInstrumentationPlugin(nitroApp) {
	nitroApp?.hooks?.hook("close", async () => {
		await shutdownInstrumentationProviders();
	});
}
export { installInstrumentationPlugin };

//# sourceMappingURL=compiled-artifacts-instrumentation.mjs.map