import path from "node:path";
import { pathToFileURL } from "node:url";

const runtimeStubSource = `
export class SvelteApplication {
	static get defaultOptions() { return {}; }
	constructor(options = {}) { this.options = options; }
	render() { return this; }
	close() {}
}
export class TJSDialog extends SvelteApplication {
	static prompt() { return Promise.resolve(null); }
	static confirm() { return Promise.resolve(false); }
	static wait() { return Promise.resolve(null); }
}
export class TJSDocument {
	constructor(doc) { this.doc = doc; }
	get() { return this.doc; }
	subscribe(fn) { fn(this.doc, { action: "init", data: [] }); return () => {}; }
	destroy() {}
}
export const TJSPosition = { Initial: {}, Validators: {} };
export const ApplicationShell = {};
export function localize(key) { return key; }
export default {};
`;

export async function resolve(specifier, context, nextResolve) {
	if (specifier.startsWith("#runtime/") || specifier.startsWith("#standard/")) {
		return {
			shortCircuit: true,
			url: `data:text/javascript;charset=utf-8,${encodeURIComponent(runtimeStubSource)}`
		};
	}
	if (specifier.endsWith(".svelte") || specifier.endsWith(".scss") || specifier.endsWith(".css")) {
		return {
			shortCircuit: true,
			url: "data:text/javascript;charset=utf-8,export default {};"
		};
	}
	try {
		return await nextResolve(specifier, context);
	} catch (err) {
		if (
			(specifier.startsWith("./") || specifier.startsWith("../"))
			&& !path.extname(specifier)
			&& context.parentURL
		) {
			const parentDir = path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
			const withJs = pathToFileURL(path.resolve(parentDir, `${specifier}.js`)).href;
			return nextResolve(withJs, context);
		}
		throw err;
	}
}
