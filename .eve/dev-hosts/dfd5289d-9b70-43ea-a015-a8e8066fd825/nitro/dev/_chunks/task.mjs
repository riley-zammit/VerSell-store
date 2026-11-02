import { fileURLToPath as __eveFileURLToPath } from "node:url";
import { dirname as __eveDirname } from "node:path";
const __filename = __eveFileURLToPath(import.meta.url);
__eveDirname(__filename);
import { HTTPError } from "file:///Users/rileyzammit/Documents/storefronts/VerSell-store/node_modules/h3/dist/_entries/node.mjs";
import "file:///Users/rileyzammit/Documents/storefronts/VerSell-store/node_modules/nitro/dist/node_modules/croner/dist/croner.js";
// #nitro/virtual/tasks
const tasks = {};
// node_modules/nitro/dist/runtime/internal/task.mjs
const __runningTasks__ = {};
async function runTask(name, { payload = {}, context = {} } = {}) {
	if (__runningTasks__[name]) return __runningTasks__[name];
	if (!(name in tasks)) throw new HTTPError({
		message: `Task \`${name}\` is not available!`,
		status: 404
	});
	if (!tasks[name].resolve) throw new HTTPError({
		message: `Task \`${name}\` is not implemented!`,
		status: 501
	});
	const handler = await tasks[name].resolve();
	const taskEvent = {
		name,
		payload,
		context
	};
	__runningTasks__[name] = handler.run(taskEvent);
	try {
		return await __runningTasks__[name];
	} finally {
		delete __runningTasks__[name];
	}
}
export { runTask, tasks };

//# sourceMappingURL=task.mjs.map