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
//#region src/addons/template.js
var Template = class {
	constructor(templateId) {
		this.source = templateId ? document.getElementById(templateId) : null;
		if (templateId && !this.source) Debug.warn(`Attract: template "#${templateId}" not found`);
	}
	render({ with: data, target, targets: selector, position }) {
		const targetElements = this.#targets({
			target,
			targets: selector
		});
		if (!targetElements.length) return [];
		if (position === "remove") {
			targetElements.forEach((element) => element.remove());
			return [];
		}
		if (!this.source) return [];
		const items = Array.isArray(data) ? data : [data];
		const results = [];
		targetElements.forEach((targetElement) => {
			items.forEach((item) => results.push(this.#renderIn({
				target: targetElement,
				item,
				position
			})));
		});
		return results;
	}
	#targets({ target, targets: selector }) {
		if (selector) return Array.from(document.querySelectorAll(selector));
		if (target) {
			const element = document.getElementById(target);
			return element ? [element] : [];
		}
		return [];
	}
	#renderIn({ target, item, position }) {
		const template = this.source.content.cloneNode(true).firstElementChild;
		this.#snapshot({
			template,
			with: item
		});
		this.#insert({
			template,
			target,
			at: position
		});
		return template;
	}
	#snapshot({ template, with: data }) {
		if (!data) return;
		for (const [key, value] of Object.entries(data)) {
			const elements = [];
			if (template.getAttribute("attract-field") === key) elements.push(template);
			elements.push(...template.querySelectorAll(`[attract-field="${key}"]`));
			for (const element of elements) this.#setValue(element, value);
		}
	}
	#setValue(element, value) {
		const tag = element.tagName;
		const type = (element.getAttribute("type") || "").toLowerCase();
		if (type === "checkbox" || type === "radio" || tag === "OPTION") {
			if (typeof value === "boolean") if (tag === "OPTION") element.selected = value;
			else element.checked = value;
			else element.value = value ?? "";
			return;
		}
		if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
			element.value = value ?? "";
			return;
		}
		element.textContent = value ?? "";
	}
	#insert({ template, target, at: position }) {
		if (position === "append") target.append(template);
		else if (position === "prepend") target.prepend(template);
		else if (position === "replace") target.replaceWith(template);
		else if (position === "before") target.before(template);
		else if (position === "after") target.after(template);
	}
};
//#endregion
//#region src/addons/attract/actions.js
function positionAction(position) {
	return (element, { value, target, targets, dataset }) => {
		const templateId = value || dataset?.template || dataset?.attractTemplate;
		if (!templateId) return;
		new Template(templateId).render({
			target: target || dataset?.attractTarget,
			targets,
			position
		});
	};
}
const append = positionAction("append");
const prepend = positionAction("prepend");
const replace = positionAction("replace");
const before = positionAction("before");
const after = positionAction("after");
function remove(element, { target, targets }) {
	if (target || targets) {
		new Template(null).render({
			target,
			targets,
			position: "remove",
			with: {}
		});
		return;
	}
	element?.remove();
}
//#endregion
//#region src/actions/request/csrf.js
const csrf = {
	header: null,
	token: null
};
//#endregion
//#region src/addons/response.js
function respond(json, { registry }) {
	const actions = Array.isArray(json) ? json : json.actions ? json.actions : [json];
	for (const item of actions) {
		const [name, ...rest] = item.action.split("#");
		const value = rest.join("#");
		if (item.template) {
			if (!item.data) Debug.warn(`Response: "template" without "data"`);
			else new Template(item.template).render({
				with: item.data,
				target: item.target,
				targets: item.targets,
				position: name
			});
			continue;
		}
		const action = registry.getAction(name);
		if (!action) {
			Debug.warn(`Response: unknown action "${name}"`);
			continue;
		}
		action(item.target ? document.getElementById(item.target) : item.targets ? document.querySelector(item.targets) : null, {
			value: value || item.value || null,
			target: item.target,
			targets: item.targets,
			dataset: {},
			data: item.data ?? null
		});
	}
}
//#endregion
//#region src/addons/attract/form.js
var Form = class {
	#optimisticElements = [];
	constructor({ form, registry }) {
		this.form = form;
		this.registry = registry;
	}
	submit() {
		const send = (event) => this.#send(event);
		this.form.addEventListener("submit", send);
		return () => this.form.removeEventListener("submit", send);
	}
	async #send(event) {
		event.preventDefault();
		const action = this.form.getAttribute("action");
		const method = (this.form.querySelector("input[name=\"_method\"]")?.value || this.form.getAttribute("method") || "post").toUpperCase();
		if (!action) return;
		const body = this.#data();
		this.#render(body);
		this.#busy();
		try {
			const request = await this.#fetch({
				action,
				method,
				body
			});
			if (!request) {
				this.#clear({ error: true });
				this.#removeOptimistic();
				return;
			}
			this.#clear(request.ok ? { success: true } : { error: true });
			if (request.json.errors) {
				this.#validity({ errors: request.json.errors });
				this.#removeOptimistic();
				return;
			}
			this.#actions(request.json);
		} catch {
			this.#clear({ error: true });
			this.#removeOptimistic();
		}
	}
	#data() {
		const formData = new FormData(this.form);
		const body = {};
		for (const [key, value] of formData.entries()) {
			if (key === "_method") continue;
			body[key] = value;
		}
		return body;
	}
	#render(body) {
		const templateId = this.form.dataset.template || this.form.dataset.attractTemplate || null;
		const target = this.form.dataset.attractTarget || this.form.getAttribute("@target") || null;
		const position = this.form.dataset.attractPosition || "append";
		if (templateId && target && Object.keys(body).length > 0) this.#optimisticElements = new Template(templateId).render({
			target,
			position,
			with: body
		});
	}
	#removeOptimistic() {
		for (const element of this.#optimisticElements) element.remove();
		this.#optimisticElements = [];
	}
	#busy() {
		this.form.removeAttribute("data-attract-busy");
		this.form.removeAttribute("data-attract-success");
		this.form.removeAttribute("data-attract-error");
		this.form.setAttribute("data-attract-busy", "");
	}
	async #fetch({ action, method, body }) {
		const headers = {
			"Content-Type": "application/json",
			Accept: "application/vnd.attract+json",
			Attract: "true"
		};
		if (csrf.token) headers[csrf.header] = typeof csrf.token === "function" ? csrf.token() : csrf.token;
		const response = await fetch(action, {
			method,
			headers,
			body: method === "GET" ? void 0 : JSON.stringify(body)
		});
		if (!response.headers.get("content-type")?.includes("json")) return null;
		let json;
		try {
			json = await response.json();
		} catch {
			return null;
		}
		return {
			ok: response.ok,
			json
		};
	}
	#clear({ success, error }) {
		this.form.removeAttribute("data-attract-busy");
		if (success) this.form.setAttribute("data-attract-success", "true");
		if (error) this.form.setAttribute("data-attract-error", "true");
	}
	#validity({ errors }) {
		for (const [name, message] of Object.entries(errors)) {
			const field = this.form.elements[name];
			if (field) {
				field.setCustomValidity(message);
				field.addEventListener("input", () => field.setCustomValidity(""), { once: true });
			}
		}
		this.form.reportValidity();
	}
	#actions(json) {
		respond(json, { registry: this.registry });
	}
};
//#endregion
//#region src/addons/attract/index.js
const forms = /* @__PURE__ */ new WeakMap();
function attract({ instance, registry }) {
	registry.addAction("append", append);
	registry.addAction("prepend", prepend);
	registry.addAction("replace", replace);
	registry.addAction("before", before);
	registry.addAction("after", after);
	registry.addAction("remove", remove);
	instance.onElementAdded((element) => {
		const attract = element.getAttribute("@attract");
		if (element.tagName === "FORM" && attract !== null) {
			if (forms.has(element)) return;
			const cleanup = new Form({
				form: element,
				registry
			}).submit();
			forms.set(element, cleanup);
			return;
		}
		if (attract !== null) element.querySelectorAll("form").forEach((form) => {
			if (forms.has(form)) return;
			const cleanup = new Form({
				form,
				registry
			}).submit();
			forms.set(form, cleanup);
		});
	});
	instance.onElementRemoved((element) => {
		const cleanup = forms.get(element);
		if (cleanup) {
			cleanup();
			forms.delete(element);
		}
	});
}
//#endregion
export { attract };
