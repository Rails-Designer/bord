//#region src/debug.js
var Debug = class {
	static enabled = false;
	static prefix = "🧲 ";
	static log(...args) {
		if (this.enabled) console.log(this.prefix, ...args);
	}
	static warn(...args) {
		if (this.enabled) console.warn(this.prefix, ...args);
	}
	static error(...args) {
		if (this.enabled) console.error(this.prefix, ...args);
	}
};
//#endregion
//#region src/core/scopes.js
const SCOPE_PROPERTY = "__attractiveScope";
function scopeOf(element) {
	let node = element;
	while (node && node.nodeType === 1) {
		if (node[SCOPE_PROPERTY]) return node;
		node = node.parentElement;
	}
	return document;
}
//#endregion
//#region src/actions/base.js
var ActionBase = class {
	static actionFor(method) {
		return (element, options = {}) => {
			return new this(element, options)[method]();
		};
	}
	constructor(element, options = {}) {
		if (!element) throw new Error("Current element is required");
		this.element = element;
		this.target = options.target;
		this.targetsSelector = options.targets;
		this.options = options;
	}
	get targets() {
		const scope = scopeOf(this.element);
		if (this.targetsSelector) return Array.from(scope.querySelectorAll(this.targetsSelector));
		if (this.target) {
			const target = scope.querySelector(`[id="${this.target}"]`);
			if (!target) Debug.warn(`Target "#${this.target}" not found`);
			return target ? [target] : [];
		}
		return [this.element];
	}
	cycledValue(currentValue, nextValues) {
		const values = Array.isArray(nextValues) ? nextValues : nextValues.split(",").map((value) => value.trim());
		return values[(values.indexOf(currentValue) + 1) % values.length];
	}
};
//#endregion
//#region src/actions/request/csrf.js
const csrf = {
	header: null,
	token: null
};
//#endregion
//#region src/actions/helpers/delay.js
const delay = () => {
	let timeoutId;
	return (callback, delay) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(callback, delay);
	};
};
//#endregion
//#region src/actions/request/helpers.js
const clearFeedback = delay();
const requests = /* @__PURE__ */ new WeakMap();
const activeRequests = {
	get({ on: element }) {
		return requests.get(element);
	},
	set({ on: element, with: controller }) {
		requests.set(element, controller);
	},
	delete({ on: element }) {
		requests.delete(element);
	}
};
function setFeedback(state, { on: element, for: targets }) {
	const duration = element.dataset.requestFeedback;
	targets.forEach((target) => {
		if (state === "busy") {
			target.setAttribute("data-request-busy", "true");
			target.removeAttribute("data-request-success");
		} else {
			target.removeAttribute("data-request-busy");
			target.setAttribute("data-request-success", state === "success");
		}
	});
	if (!duration || state === "busy") return;
	clearFeedback(() => {
		targets.forEach((target) => target.removeAttribute("data-request-success"));
	}, parseInt(duration));
}
function crossingOrigin({ for: url }) {
	try {
		return new URL(url, window.location.href).origin !== window.location.origin;
	} catch {
		Debug.error("Invalid URL:", url);
		return false;
	}
}
//#endregion
//#region src/actions/request/get.js
var Get = class {
	#element;
	#url;
	#targets;
	#onJSON;
	constructor(element, url, targets, onJSON) {
		this.#element = element;
		this.#url = url;
		this.#targets = targets;
		this.#onJSON = onJSON;
	}
	async execute() {
		if (!this.#url) {
			Debug.warn("No URL provided in the action value");
			return;
		}
		this.#warnCrossOrigin();
		const controller = this.#start();
		try {
			const response = await this.#fetch(controller);
			await this.#process(response);
			this.#succeed();
			return response;
		} catch (error) {
			this.#fail(error);
		}
	}
	#warnCrossOrigin() {
		if (crossingOrigin({ for: this.#url })) Debug.warn(`Cross-origin request to: ${this.#url}. Missing the correct CORS headers.`);
	}
	#start() {
		const previous = activeRequests.get({ on: this.#element });
		if (previous) previous.abort();
		const controller = new AbortController();
		activeRequests.set({
			on: this.#element,
			with: controller
		});
		setFeedback("busy", {
			on: this.#element,
			for: this.#targets
		});
		return controller;
	}
	#fetch(controller) {
		return fetch(this.#url, {
			method: "GET",
			signal: controller.signal,
			headers: {
				Accept: "application/vnd.attract+json",
				Attract: "true"
			}
		});
	}
	async #process(response) {
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		if (response.headers.get("content-type")?.includes("json")) {
			const json = await response.json();
			if (this.#onJSON) this.#onJSON(json);
		} else {
			const html = await response.text();
			this.#targets.forEach((target) => {
				target.innerHTML = html;
			});
		}
	}
	#succeed() {
		activeRequests.delete({ on: this.#element });
		setFeedback("success", {
			on: this.#element,
			for: this.#targets
		});
	}
	#fail(error) {
		if (error.name === "AbortError") return;
		activeRequests.delete({ on: this.#element });
		setFeedback("error", {
			on: this.#element,
			for: this.#targets
		});
		throw error;
	}
};
//#endregion
//#region src/actions/request.js
var Request = class extends ActionBase {
	constructor(element, options = {}) {
		super(element, options);
		this.value = options.value;
	}
	async get() {
		return new Get(this.element, this.value, this.targets, this.options.onJSON).execute();
	}
	post() {
		return this.#fetch("POST");
	}
	patch() {
		return this.#fetch("PATCH");
	}
	put() {
		return this.#fetch("PUT");
	}
	#fetch(method) {
		return this.#executeFetch(method);
	}
	#executeFetch(method) {
		if (!this.value) {
			Debug.warn("No URL provided in the action value");
			return;
		}
		if (crossingOrigin({ for: this.value })) Debug.warn(`Cross-origin request to: ${this.value}. Missing the correct CORS headers.`);
		const previous = activeRequests.get({ on: this.element });
		if (previous) previous.abort();
		const controller = new AbortController();
		activeRequests.set({
			on: this.element,
			with: controller
		});
		setFeedback("busy", {
			on: this.element,
			for: this.targets
		});
		const headers = {
			"Content-Type": "application/json",
			Accept: "application/vnd.attract+json",
			Attract: "true"
		};
		if (csrf.token) headers[csrf.header] = typeof csrf.token === "function" ? csrf.token() : csrf.token;
		return fetch(this.value, {
			method,
			signal: controller.signal,
			headers,
			body: JSON.stringify(this.#body)
		}).then(async (response) => {
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			if (response.headers.get("content-type")?.includes("json") && this.options.onJSON) {
				const json = await response.json();
				this.options.onJSON(json);
			}
			setFeedback("success", {
				on: this.element,
				for: this.targets
			});
			activeRequests.delete({ on: this.element });
			return response;
		}).catch((error) => {
			if (error.name === "AbortError") return;
			activeRequests.delete({ on: this.element });
			setFeedback("error", {
				on: this.element,
				for: this.targets
			});
			throw error;
		});
	}
	get #body() {
		const body = {};
		const target = this.targets[0];
		if (target instanceof HTMLFormElement) {
			const formData = new FormData(target);
			for (const [key, value] of formData.entries()) body[key] = value;
			return body;
		}
		if (this.#inputField) {
			const key = this.element.name;
			body[key] = this.element.value;
		}
		return body;
	}
	get #inputField() {
		return this.element instanceof HTMLInputElement || this.element instanceof HTMLSelectElement || this.element instanceof HTMLTextAreaElement && this.element.name;
	}
};
function get(element, options) {
	return new Request(element, {
		...options,
		onJSON: get.onJSON
	}).get();
}
get.onJSON = null;
function post(element, options) {
	return new Request(element, {
		...options,
		onJSON: post.onJSON
	}).post();
}
post.onJSON = null;
function patch(element, options) {
	return new Request(element, {
		...options,
		onJSON: patch.onJSON
	}).patch();
}
patch.onJSON = null;
function put(element, options) {
	return new Request(element, {
		...options,
		onJSON: put.onJSON
	}).put();
}
put.onJSON = null;
//#endregion
export { get, patch, post, put };
