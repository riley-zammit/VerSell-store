import { fileURLToPath as __eveFileURLToPath } from "node:url";
import { dirname as __eveDirname } from "node:path";
const __filename = __eveFileURLToPath(import.meta.url);
__eveDirname(__filename);
import { finalizeInstrumentationProviders, seedInstrumentationProviders, shutdownInstrumentationProviders } from "file:///Users/rileyzammit/Documents/storefronts/VerSell-store/node_modules/eve/dist/src/instrumentation/providers.js";
// .eve/dev-hosts/dfd5289d-9b70-43ea-a015-a8e8066fd825/artifacts/compiled-artifacts-instrumentation.mjs
seedInstrumentationProviders();
finalizeInstrumentationProviders({ serviceName: "versell" });
function installInstrumentationPlugin(nitroApp) {
	nitroApp?.hooks?.hook("close", async () => {
		await shutdownInstrumentationProviders();
	});
}
export { installInstrumentationPlugin };

//# sourceMappingURL=compiled-artifacts-instrumentation.mjs.map