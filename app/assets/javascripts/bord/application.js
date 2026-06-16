(() => {
  // attractive.js
  var Hooks = class {
    #before = /* @__PURE__ */ new Set();
    #after = /* @__PURE__ */ new Set();
    #error = /* @__PURE__ */ new Set();
    addBefore(callback) {
      this.#before.add(callback);
      return this;
    }
    addAfter(callback) {
      this.#after.add(callback);
      return this;
    }
    addError(callback) {
      this.#error.add(callback);
      return this;
    }
    removeBefore(callback) {
      this.#before.delete(callback);
      return this;
    }
    removeAfter(callback) {
      this.#after.delete(callback);
      return this;
    }
    removeError(callback) {
      this.#error.delete(callback);
      return this;
    }
    runBefore(context) {
      for (const callback of this.#before) if (callback(context) === false) return false;
    }
    runAfter(context) {
      for (const callback of this.#after) callback(context);
    }
    runError(context) {
      for (const callback of this.#error) callback(context);
    }
  };
  var Registry = class {
    #actions = /* @__PURE__ */ new Map();
    #gates = /* @__PURE__ */ new Map();
    #triggers = /* @__PURE__ */ new Map();
    #eventModifiers = /* @__PURE__ */ new Map();
    #activeActions = null;
    addAction(name, action, group = null) {
      this.#actions.set(name, {
        action,
        group
      });
    }
    getAction(name) {
      const entry = this.#actions.get(name);
      return entry ? entry.action : void 0;
    }
    hasAction(name) {
      return this.#actions.has(name);
    }
    setActiveActions(actionNames) {
      this.#activeActions = actionNames;
    }
    isAllowed(actionName) {
      if (!this.#activeActions) return true;
      return this.#activeActions.has(actionName);
    }
    addGate(name, gate) {
      this.#gates.set(name, gate);
    }
    getGate(name) {
      return this.#gates.get(name);
    }
    hasGate(name) {
      return this.#gates.has(name);
    }
    addTrigger(name, trigger) {
      this.#triggers.set(name, trigger);
    }
    getTrigger(name) {
      return this.#triggers.get(name);
    }
    hasTrigger(name) {
      return this.#triggers.has(name);
    }
    addEventModifier(name, eventModifier) {
      this.#eventModifiers.set(name, eventModifier);
    }
    getEventModifier(name) {
      return this.#eventModifiers.get(name);
    }
  };
  var RESERVED = /* @__PURE__ */ new Set(["@target", "@targets"]);
  function actionAttributes(element) {
    if (!element || !element.attributes) return false;
    for (const attribute of element.attributes) {
      if (RESERVED.has(attribute.name)) continue;
      if (attribute.name.startsWith("@")) return true;
    }
    return false;
  }
  function getActionAttributes({ on: element }) {
    const attributes = [];
    for (const attribute of element.attributes) {
      if (RESERVED.has(attribute.name)) continue;
      if (attribute.name.startsWith("@")) attributes.push(parseAttribute(attribute.name, attribute.value));
    }
    return attributes;
  }
  function parseAttribute(name, value) {
    if (name === "@action" || name === "@") return {
      event: null,
      modifiers: [],
      value
    };
    const parts = name.slice(1).split(".");
    return {
      event: parts[0],
      modifiers: parts.slice(1).flatMap((part) => part.split("+")),
      value
    };
  }
  function getTargetValue(element) {
    return element.getAttribute("@target");
  }
  function getTargetsValue(element) {
    return element.getAttribute("@targets");
  }
  var Evaluate = class {
    #registry;
    constructor(registry) {
      this.#registry = registry;
    }
    async run(action, { for: event, on: element, using: defaultEventType, triggeredBy: directive, state }, { execute }) {
      if (action.startsWith("js:")) return await execute(action, { with: {
        on: element,
        for: event,
        triggeredBy: directive || null,
        state
      } });
      if (action.includes(":")) action = this.#stripDirectives({
        from: action,
        for: event,
        on: element
      });
      if (action === void 0) return;
      return await execute(action, { with: {
        on: element,
        for: event,
        triggeredBy: directive || null,
        state
      } });
    }
    #stripDirectives({ from: action, for: event, on: element }) {
      const [base, ...directives] = action.split(":");
      if (!directives.filter((name) => !(this.#registry.hasTrigger(name) && event.type === name)).every((name) => this.#passes(name, {
        for: event,
        on: element
      }))) return;
      return base;
    }
    #passes(name, { for: event, on: element }) {
      const gated = this.#registry.getGate(name);
      if (!gated) return event.type === name;
      return gated(element, { event }) !== false;
    }
  };
  var Debug = class {
    static enabled = false;
    static prefix = "\u{1F9F2} ";
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
  var Execute = class {
    #registry;
    #hooks;
    #onError;
    #getTargetValue;
    #getTargetsValue;
    constructor(registry, hooks, onError, getTargetValue2, getTargetsValue2) {
      this.#registry = registry;
      this.#hooks = hooks;
      this.#onError = onError;
      this.#getTargetValue = getTargetValue2;
      this.#getTargetsValue = getTargetsValue2;
    }
    async run(action, { with: { on: element, for: event, triggeredBy: directive, state } }) {
      const resolved = this.#resolve({ from: action });
      if (resolved === void 0) return;
      const { name, value } = resolved;
      const target = this.#getTargetValue(element);
      const targets = this.#getTargetsValue(element);
      const hookContext = this.#hookContext({
        name,
        value,
        on: element,
        for: event,
        target,
        targets
      });
      const actionContext = this.#actionContext({
        name,
        value,
        on: element,
        for: event,
        target,
        targets,
        triggeredBy: directive,
        state
      });
      if (this.#hooks?.runBefore(hookContext) === false) {
        event?.preventDefault();
        return false;
      }
      const startTime = performance.now();
      const result = await this.#invoke({
        name,
        on: element,
        context: actionContext
      });
      const elapsed = performance.now() - startTime;
      this.#hooks?.runAfter({
        ...hookContext,
        result
      });
      this.#log({
        name,
        on: element,
        for: event,
        elapsed,
        target
      });
      if (result === false && event) event.preventDefault();
      return result;
    }
    #resolve({ from: action }) {
      if (action.startsWith("js:")) return {
        name: "js",
        value: action.slice(3)
      };
      const parts = action.split("#");
      const [possibleAction, fallbackAction, fallbackValue] = parts;
      const name = this.#registry.hasAction(possibleAction) ? possibleAction : this.#registry.hasAction(fallbackAction) ? fallbackAction : action;
      if (!this.#registry.isAllowed(name)) return;
      if (typeof this.#registry.getAction(name) !== "function") return;
      return {
        name,
        value: this.#registry.hasAction(possibleAction) ? parts.slice(1).join("#") : fallbackValue ?? null
      };
    }
    #hookContext({ name, value, on: element, for: event, target, targets }) {
      return {
        name,
        element,
        options: {
          value,
          target,
          targets
        },
        event: event || null
      };
    }
    #actionContext({ name, value, on: element, for: event, target, targets, triggeredBy: directive, state }) {
      return {
        value,
        target,
        targets,
        event: event || null,
        actionName: name,
        triggeredBy: directive || null,
        state,
        dataset: element.dataset
      };
    }
    async #invoke({ name, on: element, context }) {
      try {
        const Action2 = this.#registry.getAction(name);
        if (typeof Action2 === "function" && Action2.prototype?.run) {
          const instance = new Action2(element, context);
          instance.element = element;
          instance.options = context;
          return await instance.run();
        }
        return await Action2(element, context);
      } catch (error) {
        this.#reportError({
          name,
          on: element,
          error
        });
      }
    }
    #reportError({ name: actionName, on: element, error }) {
      const targetId = element.id || this.#getTargetValue(element) || "";
      const message = `${actionName} on ${element.tagName.toLowerCase()}#${targetId}: ${error.message}`;
      Debug.error(message);
      if (this.#hooks) this.#hooks.runError({
        name: actionName,
        element,
        error
      });
      if (this.#onError) this.#onError(error, message, {
        actionName,
        element
      });
    }
    #log({ name, on: element, for: event, elapsed, target }) {
      const targetId = element.id || target || "";
      const ref = targetId ? `#${targetId}` : "";
      const tag = element.tagName.toLowerCase();
      Debug.log(`${name} \u2192 ${tag}${ref} (${elapsed.toFixed(2)}ms) [${event?.type}]`);
    }
  };
  var Events = class {
    #evaluate;
    #execute;
    constructor(registry, hooks, onError) {
      this.#evaluate = new Evaluate(registry);
      this.#execute = new Execute(registry, hooks, onError, (element) => getTargetValue(element), (element) => getTargetsValue(element));
    }
    async process(event, { on: element, using: defaultEventType, triggeredBy: directive, with: actionValue, state }) {
      if (!element || !actionValue) return;
      for (const action of this.#splitActions(actionValue)) if (await this.#evaluate.run(action, {
        for: event,
        on: element,
        using: defaultEventType,
        triggeredBy: directive,
        state
      }, { execute: (action2, context) => this.#execute.run(action2, context) }) === false) return false;
    }
    #splitActions(action) {
      if (action.startsWith("js:")) return [action];
      return action.split(" ").filter((action2) => action2);
    }
  };
  var EventTypes = class {
    getDefault({ from: element }) {
      const tagName = element.tagName.toLowerCase();
      const isInput = tagName === "input";
      const inputType = isInput ? element.type || "text" : null;
      return isInput ? this.#defaultEvents.input[inputType] || this.#defaultEvents.input.default : this.#defaultEvents[tagName] || this.#defaultEvents.default;
    }
    #defaultEvents = {
      a: "click",
      button: "click",
      input: {
        checkbox: "change",
        radio: "change",
        submit: "click",
        button: "click",
        reset: "click",
        default: "input"
      },
      select: "change",
      textarea: "input",
      form: "submit",
      default: "click"
    };
  };
  var Triggers = class {
    #registry;
    constructor(registry) {
      this.#registry = registry;
    }
    setup({ for: directive, on: element, trigger: run, argument = null }) {
      const trigger = this.#registry.getTrigger(directive);
      if (!trigger) return false;
      trigger(element, run, argument);
      return true;
    }
  };
  var ElementLifecycleHooks = class {
    #added = /* @__PURE__ */ new Set();
    #removed = /* @__PURE__ */ new Set();
    #beforeRemove = /* @__PURE__ */ new Set();
    #targetAdded = /* @__PURE__ */ new Map();
    #targetRemoved = /* @__PURE__ */ new Map();
    onAdded(callback) {
      this.#added.add(callback);
      return this;
    }
    onRemoved(callback) {
      this.#removed.add(callback);
      return this;
    }
    onBeforeRemove(callback) {
      this.#beforeRemove.add(callback);
      return this;
    }
    onTargetAdded(id, callback) {
      if (!this.#targetAdded.has(id)) this.#targetAdded.set(id, /* @__PURE__ */ new Set());
      this.#targetAdded.get(id).add(callback);
      return this;
    }
    onTargetRemoved(id, callback) {
      if (!this.#targetRemoved.has(id)) this.#targetRemoved.set(id, /* @__PURE__ */ new Set());
      this.#targetRemoved.get(id).add(callback);
      return this;
    }
    hasTarget(id) {
      return this.#targetAdded.has(id) || this.#targetRemoved.has(id);
    }
    notifyAdded(element) {
      this.#added.forEach((fn) => fn(element));
    }
    notifyRemoved(element) {
      this.#removed.forEach((fn) => fn(element));
    }
    notifyBeforeRemove(element) {
      this.#beforeRemove.forEach((fn) => fn(element));
    }
    notifyTargetAdded(element) {
      this.#targetAdded.get(element.id)?.forEach((fn) => fn(element));
    }
    notifyTargetRemoved(element) {
      this.#targetRemoved.get(element.id)?.forEach((fn) => fn(element));
    }
    clear() {
      this.#added.clear();
      this.#removed.clear();
      this.#beforeRemove.clear();
      this.#targetAdded.clear();
      this.#targetRemoved.clear();
    }
  };
  var EventSubscriptions = class {
    #subscriptions = /* @__PURE__ */ new Map();
    #scope = document;
    setScope(scope) {
      this.#scope = scope;
    }
    add(type, callback) {
      if (!this.#subscriptions.has(type)) {
        const listener = (event) => {
          this.#subscriptions.get(type).subscriptions.forEach((fn) => fn(event));
        };
        this.#scope.addEventListener(type, listener);
        this.#subscriptions.set(type, {
          listener,
          subscriptions: /* @__PURE__ */ new Set()
        });
      }
      this.#subscriptions.get(type).subscriptions.add(callback);
      return this;
    }
    removeAll() {
      this.#subscriptions.forEach(({ listener }, type) => {
        this.#scope.removeEventListener(type, listener);
      });
      this.#subscriptions.clear();
    }
  };
  var AttributePrefixes = class {
    #prefixes = /* @__PURE__ */ new Set();
    add(prefix) {
      this.#prefixes.add(prefix);
      return this;
    }
    matches(element) {
      if (actionAttributes(element)) return true;
      return Array.from(this.#prefixes).some((prefix) => Array.from(element.attributes).some((attribute) => attribute.name.startsWith(prefix)));
    }
    clear() {
      this.#prefixes.clear();
    }
  };
  var debounce = () => {
    let timeoutId;
    return (callback, delay3) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay3);
    };
  };
  var SCOPE_PROPERTY = "__attractiveScope";
  function registerScope(root) {
    if (root && root.nodeType === 1 && !root[SCOPE_PROPERTY]) Object.defineProperty(root, SCOPE_PROPERTY, {
      value: true,
      configurable: true
    });
  }
  function unregisterScope(root) {
    if (root && root.nodeType === 1 && root[SCOPE_PROPERTY]) delete root[SCOPE_PROPERTY];
  }
  function insideNestedScope(element, scope) {
    let node = element;
    while (node && node.nodeType === 1 && node !== scope) {
      if (node[SCOPE_PROPERTY]) return true;
      node = node.parentElement;
    }
    return false;
  }
  function scopeOf(element) {
    let node = element;
    while (node && node.nodeType === 1) {
      if (node[SCOPE_PROPERTY]) return node;
      node = node.parentElement;
    }
    return document;
  }
  var debounceTimers = /* @__PURE__ */ new WeakMap();
  var Actions = class Actions2 {
    static #nonBubblingEvents = /* @__PURE__ */ new Set([
      "mouseenter",
      "mouseleave",
      "focus",
      "blur",
      "load",
      "error",
      "unload",
      "resize",
      "scroll"
    ]);
    #registry;
    #events;
    #eventTypes;
    #triggers;
    #listeners;
    #element;
    #scope;
    constructor(registry, events, eventTypes, triggers, listeners, element) {
      this.#registry = registry;
      this.#events = events;
      this.#eventTypes = eventTypes;
      this.#triggers = triggers;
      this.#listeners = listeners;
      this.#element = element;
      this.#scope = element;
    }
    prepare(element) {
      const attributes = getActionAttributes({ on: element });
      if (attributes.length === 0) return;
      this.#registerDirectListeners({
        on: element,
        from: attributes
      });
      this.#registerDelegationListeners({
        on: element,
        from: attributes
      });
      this.#setupDirectiveTriggers({
        on: element,
        from: attributes
      });
    }
    process(event, context = null) {
      const element = context ? context.element : this.#actionElement(event.target);
      if (!element) return;
      if (!this.#scope.contains(element)) return;
      if (insideNestedScope(element, this.#scope)) return;
      this.#debounced(() => this.#execute({
        event,
        with: context,
        on: element
      }), element);
    }
    #registerDirectListeners({ on: element, from: attributes }) {
      for (const { event: eventName, modifiers, value } of attributes) {
        const eventType = eventName || this.#defaultEventType({ for: element });
        if (modifiers.includes("window") || modifiers.includes("document")) {
          const target = modifiers.includes("window") ? window : document;
          this.#listeners.addTargetedEventListener({
            for: eventType,
            on: target,
            element
          });
          continue;
        }
        if (Actions2.#nonBubblingEvents.has(eventType)) element.addEventListener(eventType, (event) => {
          if (insideNestedScope(element, this.#scope)) return;
          this.#events.process(event, {
            on: element,
            using: this.#defaultEventType({ for: element }),
            with: value
          });
        });
      }
    }
    #registerDelegationListeners({ on: element, from: attributes }) {
      const eventTypes = /* @__PURE__ */ new Set();
      for (const { event: eventName, modifiers } of attributes) {
        if (modifiers.includes("window") || modifiers.includes("document")) continue;
        const eventType = eventName || this.#defaultEventType({ for: element });
        if (Actions2.#nonBubblingEvents.has(eventType)) continue;
        eventTypes.add(eventType);
      }
      eventTypes.forEach((eventType) => {
        this.#listeners.addEventListeners({
          for: eventType,
          on: this.#element
        });
      });
    }
    #setupDirectiveTriggers({ on: element, from: attributes }) {
      const directives = [...new Set(attributes.filter(({ value }) => !value.startsWith("js:")).flatMap(({ value }) => value.split(" ").filter((name) => name.includes(":")).flatMap((name) => name.split(":").slice(1))))];
      const defaultEventType = this.#defaultEventType({ for: element });
      directives.forEach((name) => {
        this.#triggers.setup({
          for: name,
          on: element,
          trigger: (state) => {
            this.#debounced(() => {
              attributes.forEach(({ value: actionValue }) => {
                this.#events.process({ type: name }, {
                  on: element,
                  using: defaultEventType,
                  triggeredBy: name,
                  with: actionValue,
                  state
                });
              });
            }, element);
          }
        });
      });
    }
    #debounced(run, element) {
      const delay3 = this.#debounceDelay(element);
      if (delay3 > 0) {
        let timer = debounceTimers.get(element);
        if (!timer) {
          timer = debounce();
          debounceTimers.set(element, timer);
        }
        timer(run, delay3);
        return;
      }
      run();
    }
    #debounceDelay(element) {
      return parseInt(element.dataset.debounce ?? element.dataset.formDebounce ?? element.dataset.requestDebounce ?? 0);
    }
    #execute({ event, with: context, on: element }) {
      if (!this.#scope.contains(element)) return;
      if (insideNestedScope(element, this.#scope)) return;
      const defaultEventType = context ? context.eventType : this.#defaultEventType({ for: element });
      const attributes = getActionAttributes({ on: element });
      for (const { event: eventName, modifiers, value } of attributes) {
        if ((eventName !== null ? eventName : defaultEventType) !== event.type) continue;
        if (this.#blockedByEventModifiers({
          for: event,
          on: element,
          modifiers
        })) continue;
        this.#events.process(event, {
          on: element,
          using: defaultEventType,
          with: value
        });
      }
    }
    #blockedByEventModifiers({ for: event, on: element, modifiers }) {
      return modifiers.some((name) => {
        const eventModifier = this.#registry.getEventModifier(name);
        if (eventModifier) return eventModifier(event, element) === false;
        if (event.key === void 0) return false;
        return event.key.toLowerCase() !== name.toLowerCase();
      });
    }
    #defaultEventType({ for: element }) {
      return this.#eventTypes.getDefault({ from: element });
    }
    #actionElement(element) {
      while (element) {
        if (actionAttributes(element)) return element;
        element = element.parentElement;
      }
      return null;
    }
  };
  var EventListeners = class {
    #eventListeners = /* @__PURE__ */ new Map();
    #elementListeners = /* @__PURE__ */ new WeakMap();
    #targetedEventListeners = /* @__PURE__ */ new Map();
    #targetedEvents = /* @__PURE__ */ new Map();
    #process;
    constructor(process) {
      this.#process = process;
    }
    addEventListeners({ for: eventType, on: element }) {
      if (this.#eventListeners.has(eventType)) return;
      const processEvent = (event) => this.#process(event);
      element.addEventListener(eventType, processEvent);
      Debug.log("Added event listener for", eventType, "to", element);
      this.#eventListeners.set(eventType, {
        listener: processEvent,
        element
      });
    }
    addTargetedEventListener({ for: eventType, on: target, element }) {
      const key = `${target === window ? "window" : "document"}:${eventType}`;
      if (!this.#elementListeners.has(element)) this.#elementListeners.set(element, /* @__PURE__ */ new Set());
      this.#elementListeners.get(element).add(key);
      if (!this.#targetedEvents.has(key)) this.#targetedEvents.set(key, /* @__PURE__ */ new Set());
      this.#targetedEvents.get(key).add(element);
      if (!this.#targetedEventListeners.has(key)) {
        const processElements = (event) => {
          const elements = this.#targetedEvents.get(key);
          if (!elements) return;
          elements.forEach((element2) => {
            this.#process(event, {
              element: element2,
              eventType
            });
          });
        };
        target.addEventListener(eventType, processElements);
        this.#targetedEventListeners.set(key, processElements);
      }
    }
    cleanup(element) {
      const keys = this.#elementListeners.get(element);
      if (!keys) return;
      keys.forEach((key) => {
        const events = this.#targetedEvents.get(key);
        if (events) {
          events.delete(element);
          if (events.size === 0) {
            const [targetName, eventType] = key.split(":");
            const listener = this.#targetedEventListeners.get(key);
            (targetName === "window" ? window : document).removeEventListener(eventType, listener);
            this.#targetedEventListeners.delete(key);
            this.#targetedEvents.delete(key);
          }
        }
      });
      this.#elementListeners.delete(element);
    }
    removeAll() {
      for (const [eventType, { listener, element }] of this.#eventListeners) element.removeEventListener(eventType, listener);
      this.#eventListeners.clear();
      for (const [key, listener] of this.#targetedEventListeners) {
        const [targetName, eventType] = key.split(":");
        (targetName === "window" ? window : document).removeEventListener(eventType, listener);
      }
      this.#targetedEventListeners.clear();
      this.#targetedEvents.clear();
      this.#elementListeners = /* @__PURE__ */ new WeakMap();
    }
  };
  var ELEMENT_NODE = typeof Node !== "undefined" && Node.ELEMENT_NODE || 1;
  var ATTRIBUTE_PREFIX = "@";
  var RESERVED_ATTRIBUTES = /* @__PURE__ */ new Set(["@target", "@targets"]);
  var Observer = class {
    #prepare;
    #cleanup;
    #beforeCleanup;
    #observer;
    #scope;
    constructor(prepare, cleanup = null, scope = document.documentElement, beforeCleanup = null) {
      this.#prepare = prepare;
      this.#cleanup = cleanup;
      this.#beforeCleanup = beforeCleanup;
      this.#scope = scope;
    }
    start(action) {
      if (!window.MutationObserver) return;
      this.#observer = new MutationObserver((mutations) => {
        const added = /* @__PURE__ */ new Set();
        const removed = /* @__PURE__ */ new Set();
        const changed = /* @__PURE__ */ new Set();
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            this.#processChildMutation(mutation, {
              for: action,
              elements: {
                added,
                removed
              }
            });
            continue;
          }
          if (mutation.type === "attributes" && mutation.attributeName.startsWith(ATTRIBUTE_PREFIX) && !RESERVED_ATTRIBUTES.has(mutation.attributeName)) changed.add(mutation.target);
        }
        added.forEach((element) => {
          Debug.log("Element added:", element.tagName.toLowerCase(), "#" + (element.id || element.dataset.target || ""));
          this.#prepare(element);
        });
        if (this.#beforeCleanup || this.#cleanup) removed.forEach((element) => {
          Debug.log("Element removed:", element.tagName.toLowerCase(), "#" + (element.id || ""));
          this.#beforeCleanup?.(element);
          this.#cleanup?.(element);
        });
        if (this.#cleanup) changed.forEach((element) => {
          if (removed.has(element)) return;
          Debug.log("Attribute changed:", element.tagName.toLowerCase(), "#" + (element.id || ""));
          this.#cleanup(element);
          if (action(element)) this.#prepare(element);
        });
      });
      this.#observer.observe(this.#scope, {
        childList: true,
        subtree: true,
        attributes: true
      });
      return this;
    }
    stop() {
      if (this.#observer) this.#observer.disconnect();
      return this;
    }
    #processChildMutation(mutation, { for: action, elements: { added, removed } }) {
      mutation.addedNodes.forEach((node) => {
        this.#processNode(node, {
          for: action,
          and: added
        });
      });
      mutation.removedNodes.forEach((node) => {
        this.#processNode(node, {
          for: action,
          and: removed
        });
      });
    }
    #processNode(node, { for: action, and: elements }) {
      if (node.nodeType !== ELEMENT_NODE) return;
      if (action(node)) elements.add(node);
      if (!node.querySelectorAll) return;
      node.querySelectorAll("*").forEach((element) => {
        if (action(element)) elements.add(element);
      });
    }
  };
  var Activation = class {
    #registry;
    #scope;
    #events;
    #eventTypes;
    #triggers;
    #listeners;
    #elementLifecycle;
    #subscriptions;
    #attributePrefixes;
    #owner;
    #actions;
    #observe;
    #initialized = false;
    constructor(dependencies) {
      this.#registry = dependencies.registry;
      this.#events = dependencies.events;
      this.#eventTypes = dependencies.eventTypes;
      this.#triggers = dependencies.triggers;
      this.#elementLifecycle = dependencies.elementLifecycle;
      this.#subscriptions = dependencies.subscriptions;
      this.#attributePrefixes = dependencies.attributePrefixes;
      this.#owner = dependencies.owner;
      this.#listeners = new EventListeners((event, context) => this.#actions?.process(event, context));
    }
    get active() {
      return this.#initialized;
    }
    activate(options = {}) {
      const { on = document, debug = false, extendWith = [], addActions = {}, addGates = {}, addTriggers = {} } = options;
      Debug.enabled = debug;
      if (!on) {
        Debug.error("scope element not found: activate() requires a valid DOM element");
        return this;
      }
      if (this.#initialized) return this;
      for (const [name, action] of Object.entries(addActions)) this.#registry.addAction(name, action);
      for (const [name, action] of Object.entries(addGates)) this.#registry.addGate(name, action);
      for (const [name, action] of Object.entries(addTriggers)) this.#registry.addTrigger(name, action);
      this.#scope = on;
      registerScope(on);
      this.#subscriptions.setScope(on);
      this.#actions = new Actions(this.#registry, this.#events, this.#eventTypes, this.#triggers, this.#listeners, on);
      this.#observe = new Observer((element) => {
        this.#elementLifecycle.notifyAdded(element);
        this.#elementLifecycle.notifyTargetAdded(element);
        this.#actions.prepare(element);
      }, (element) => {
        this.#listeners.cleanup(element);
        this.#elementLifecycle.notifyRemoved(element);
        this.#elementLifecycle.notifyTargetRemoved(element);
      }, on, (element) => {
        this.#elementLifecycle.notifyBeforeRemove(element);
      });
      const elements = [on, ...on.querySelectorAll("*")];
      const actionElements = [];
      for (const element of elements) if (this.#shouldPrepare(element)) actionElements.push(element);
      for (const extension2 of extendWith) extension2({
        instance: this.#owner,
        registry: this.#registry
      });
      actionElements.forEach((element) => {
        this.#elementLifecycle.notifyAdded(element);
        this.#elementLifecycle.notifyTargetAdded(element);
      });
      actionElements.forEach((element) => {
        this.#actions.prepare(element);
      });
      this.#observe.start((element) => this.#shouldPrepare(element));
      this.#initialized = true;
      if (Debug.enabled) Debug.log(`active \u2014 ${actionElements.length} element${actionElements.length === 1 ? "" : "s"} with actions`);
      return this;
    }
    deactivate() {
      if (!this.#initialized) return this;
      unregisterScope(this.#scope);
      this.#listeners.removeAll();
      if (this.#observe) this.#observe.stop();
      this.#subscriptions.removeAll();
      this.#elementLifecycle.clear();
      this.#attributePrefixes.clear();
      this.#initialized = false;
      Debug.log("deactivated");
      return this;
    }
    notifyExistingTargets(id) {
      if (!this.#scope) return this;
      this.#scope.querySelectorAll(`[id="${id}"]`).forEach((element) => {
        this.#elementLifecycle.notifyTargetAdded(element);
      });
      return this;
    }
    #shouldPrepare(element) {
      return (this.#attributePrefixes.matches(element) || this.#elementLifecycle.hasTarget(element.id)) && !insideNestedScope(element, this.#scope);
    }
  };
  function defaultEventModifier(registry) {
    registry.addEventModifier("window", () => true);
    registry.addEventModifier("document", () => true);
  }
  var Attractive = class Attractive2 {
    #registry = new Registry();
    #events;
    #eventTypes;
    #triggers;
    #activation;
    #hooks = new Hooks();
    #elementLifecycle = new ElementLifecycleHooks();
    #subscriptions = new EventSubscriptions();
    #attributePrefixes = new AttributePrefixes();
    static activate(options = {}) {
      const instance = new this(options);
      instance.activate(options);
      return instance;
    }
    /**
    * Returns whether debug logging is enabled.
    *
    * @returns {boolean} — current debug state
    */
    static get debug() {
      return Debug.enabled;
    }
    /**
    * Toggle debug logging on or off.
    *
    * @param {boolean} value — true to enable debug output
    */
    static set debug(value) {
      Debug.enabled = value;
    }
    get debug() {
      return Debug.enabled;
    }
    set debug(value) {
      Debug.enabled = value;
    }
    /**
    * Returns whether the instance is currently active.
    *
    * @returns {boolean} — true if activate() has been called and deactivate() has not
    */
    get active() {
      return this.#activation.active;
    }
    static onError(error, message) {
      console.warn(`[attractive] ${message}`, error);
      if (typeof window.onerror === "function") window.onerror(message, null, null, null, error);
    }
    constructor() {
      this.#events = new Events(this.#registry, this.#hooks, (error, message, detail) => Attractive2.onError(error, message, detail));
      this.#eventTypes = new EventTypes();
      this.#triggers = new Triggers(this.#registry);
      defaultEventModifier(this.#registry);
      this.#activation = new Activation({
        registry: this.#registry,
        events: this.#events,
        eventTypes: this.#eventTypes,
        triggers: this.#triggers,
        elementLifecycle: this.#elementLifecycle,
        subscriptions: this.#subscriptions,
        attributePrefixes: this.#attributePrefixes,
        owner: this
      });
    }
    /**
    * Activates the Attractive instance on the given scope.
    *
    * @param {Object} [options] — activation options
    * @param {HTMLElement|Document} [options.on=document] — root element to observe
    * @param {boolean} [options.debug=false] — enable debug logging
    * @returns {Attractive} — the instance for chaining
    */
    activate(options = {}) {
      this.#activation.activate(options);
      return this;
    }
    /**
    * Restricts available actions to the given names.
    *
    * @param {string[]} [actionNames] — action names to enable (all enabled if empty)
    * @returns {Attractive} — the instance for chaining
    */
    withActions(actionNames = []) {
      Debug.log("Initializing with actions", actionNames);
      if (actionNames.length > 0) this.#registry.setActiveActions(new Set(actionNames));
      return this;
    }
    /**
    * Registers a callback that runs before each action.
    * Return false to cancel the action.
    *
    * @param {Function} callback — receives { name, element, options, event }
    * @returns {Attractive} — the instance for chaining
    */
    beforeAction(callback) {
      this.#hooks.addBefore(callback);
      return this;
    }
    /**
    * Registers a callback that runs after each successful action.
    *
    * @param {Function} callback — receives { name, element, options, event, result }
    * @returns {Attractive} — the instance for chaining
    */
    afterAction(callback) {
      this.#hooks.addAfter(callback);
      return this;
    }
    /**
    * Registers a callback that runs when an action throws an error.
    *
    * @param {Function} callback — receives { name, element, options, event, error }
    * @returns {Attractive} — the instance for chaining
    */
    onError(callback) {
      this.#hooks.addError(callback);
      return this;
    }
    /**
    * Deactivates the instance, removing all event listeners and observer.
    *
    * @returns {Attractive} — the instance for chaining
    */
    deactivate() {
      this.#activation.deactivate();
      return this;
    }
    /**
    * Deactivates and reactivates the instance with optional new options.
    *
    * @param {Object} [options] — same options as activate()
    * @returns {Attractive} — the instance for chaining
    */
    restart(options = {}) {
      this.deactivate();
      return this.activate(options);
    }
    onElementAdded(callback) {
      this.#elementLifecycle.onAdded(callback);
      return this;
    }
    onElementRemoved(callback) {
      this.#elementLifecycle.onRemoved(callback);
      return this;
    }
    onBeforeElementRemoved(callback) {
      this.#elementLifecycle.onBeforeRemove(callback);
      return this;
    }
    onTargetConnected(id, callback) {
      this.#elementLifecycle.onTargetAdded(id, callback);
      this.#activation.notifyExistingTargets(id);
      return this;
    }
    onTargetDisconnected(id, callback) {
      this.#elementLifecycle.onTargetRemoved(id, callback);
      return this;
    }
    addEventListener(type, callback) {
      this.#subscriptions.add(type, callback);
      return this;
    }
    observeAttribute(prefix) {
      this.#attributePrefixes.add(prefix);
      return this;
    }
  };
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
  var Action = class extends ActionBase {
    get value() {
      return this.options.value;
    }
    get dataset() {
      return this.element.dataset;
    }
    dispatchEvent(name, detail = {}) {
      this.element.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        detail
      }));
    }
  };
  var sanitize = (value) => {
    return value?.split(",").map((className) => className.trim()).filter(Boolean) ?? [];
  };
  var Class = class extends ActionBase {
    constructor(element, options = {}) {
      super(element, options);
      this.value = sanitize(options.value);
    }
    toggle() {
      if (!this.value) return;
      this.targets.forEach((target) => this.#toggleClasses({ forEach: target }));
    }
    cycle() {
      if (!this.value || this.value.length === 0) return;
      this.targets.forEach((target) => this.#cycleClasses(target));
    }
    add() {
      if (!this.value) return;
      this.targets.forEach((target) => target.classList.add(...this.value));
    }
    set() {
      const key = this.element.dataset.store;
      if (key) {
        const value = globalThis.$store?.get(key);
        if (value === void 0) return;
        this.targets.forEach((target) => target.classList.toggle(...this.value, !!value));
        return;
      }
      if (!this.value) return;
      this.targets.forEach((target) => {
        target.className = "";
        target.classList.add(...this.value);
      });
    }
    remove() {
      if (!this.value) return;
      this.targets.forEach((target) => target.classList.remove(...this.value));
    }
    #toggleClasses({ forEach: target }) {
      this.value.forEach((className) => target.classList.toggle(className));
    }
    #cycleClasses(target) {
      const currentClass = this.value.find((className) => target.classList.contains(className)) || "";
      const nextClass = this.cycledValue(currentClass, this.value);
      target.classList.remove(...this.value);
      target.classList.add(nextClass);
    }
  };
  var actions$9 = {
    toggleClass: Class.actionFor("toggle"),
    cycleClass: Class.actionFor("cycle"),
    addClass: Class.actionFor("add"),
    setClass: Class.actionFor("set"),
    removeClass: Class.actionFor("remove")
  };
  var delay = () => {
    let timeoutId;
    return (callback, delay3) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay3);
    };
  };
  var clearFeedback$1 = delay();
  var Clipboard = class extends ActionBase {
    constructor(element, options = {}) {
      super(element, options);
      this.value = options.value;
    }
    async copy() {
      const textToCopy = this.value || (this.targets[0]?.value ?? this.targets[0]?.textContent);
      if (textToCopy === void 0) return;
      try {
        await navigator.clipboard.writeText(textToCopy);
        this.#setFeedback(true);
      } catch (error) {
        this.#setFeedback(false);
      }
    }
    #setFeedback(succeeded) {
      const delay3 = parseInt(this.element.dataset.copyFeedback);
      this.targets.forEach((target) => target.setAttribute(this.#attributeName, succeeded));
      if (!delay3) return;
      clearFeedback$1(() => this.targets.forEach((target) => target.removeAttribute(this.#attributeName)), delay3);
    }
    get #attributeName() {
      return "data-copy-success";
    }
  };
  var actions$8 = { copy: Clipboard.actionFor("copy") };
  var clearFeedback = delay();
  var Confirm = class extends ActionBase {
    confirm() {
      const message = this.element.dataset.confirmMessage || "Are you sure?";
      const confirmed = window.confirm(message);
      this.#setFeedback(confirmed);
      return confirmed;
    }
    #setFeedback(confirmed) {
      this.element.setAttribute("data-confirm-success", confirmed);
      const duration = this.element.dataset.confirmFeedback;
      if (!duration) return;
      clearFeedback(() => this.element.removeAttribute("data-confirm-success"), parseInt(duration));
    }
  };
  var actions$7 = { confirm: Confirm.actionFor("confirm") };
  var attributeOperations = {
    get(element, name) {
      return element.getAttribute(name);
    },
    set(element, name, value) {
      element.setAttribute(name, value);
    },
    has(element, name) {
      return element.hasAttribute(name);
    },
    remove(element, name) {
      element.removeAttribute(name);
    }
  };
  var dataAttributeOperations = {
    get(element, name) {
      return element.dataset[name];
    },
    set(element, name, value) {
      element.dataset[name] = value;
    },
    has(element, name) {
      return name in element.dataset;
    },
    remove(element, name) {
      delete element.dataset[name];
    }
  };
  var DOMAttribute = class extends ActionBase {
    constructor(element, options = {}) {
      super(element, options);
      const [attribute, value] = options.value.split("=");
      this.attribute = attribute;
      this.value = value;
    }
    toggle() {
      if (!this.attribute) return;
      this.targets.forEach((target) => this.operations.has(target, this.attribute) ? this.operations.remove(target, this.attribute) : this.operations.set(target, this.attribute, this.value || ""));
    }
    cycle() {
      if (!this.value) return;
      this.targets.forEach((target) => this.#cycleAttribute(target));
    }
    add() {
      if (!this.attribute) return;
      this.targets.forEach((target) => this.operations.set(target, this.attribute, this.value || ""));
    }
    set() {
      const key = this.element.dataset.store;
      if (key) {
        const value = globalThis.$store?.get(key);
        if (value === void 0) return;
        this.targets.forEach((target) => value ? this.operations.set(target, this.attribute, this.value || "") : this.operations.remove(target, this.attribute));
        return;
      }
      return this.add();
    }
    remove() {
      if (!this.attribute) return;
      this.targets.forEach((target) => this.operations.remove(target, this.attribute));
    }
    #cycleAttribute(target) {
      const currentValue = this.operations.get(target, this.attribute);
      const nextValue = this.cycledValue(currentValue, this.value);
      this.operations.set(target, this.attribute, nextValue);
    }
  };
  var Attribute = class extends DOMAttribute {
    get operations() {
      return attributeOperations;
    }
  };
  var DataAttribute = class extends DOMAttribute {
    get operations() {
      return dataAttributeOperations;
    }
  };
  var toggleAttribute = Attribute.actionFor("toggle");
  var cycleAttribute = Attribute.actionFor("cycle");
  var addAttribute = Attribute.actionFor("add");
  var setAttribute = Attribute.actionFor("set");
  var removeAttribute = Attribute.actionFor("remove");
  var toggleDataAttribute = DataAttribute.actionFor("toggle");
  var cycleDataAttribute = DataAttribute.actionFor("cycle");
  var addDataAttribute = DataAttribute.actionFor("add");
  var setDataAttribute = DataAttribute.actionFor("set");
  var removeDataAttribute = DataAttribute.actionFor("remove");
  var attributeActions = {
    toggleAttribute,
    cycleAttribute,
    addAttribute,
    setAttribute,
    removeAttribute
  };
  var dataAttributeActions = {
    toggleDataAttribute,
    cycleDataAttribute,
    addDataAttribute,
    setDataAttribute,
    removeDataAttribute
  };
  var Dialog = class extends ActionBase {
    open() {
      this.targets.forEach((target) => target instanceof HTMLDialogElement && target.show());
    }
    openModal() {
      this.targets.forEach((target) => target instanceof HTMLDialogElement && target.showModal());
    }
    close() {
      this.targets.forEach((target) => target instanceof HTMLDialogElement && target.close());
    }
  };
  var actions$6 = {
    open: Dialog.actionFor("open"),
    openModal: Dialog.actionFor("openModal"),
    close: Dialog.actionFor("close")
  };
  var Focus = class extends ActionBase {
    focus() {
      this.targets.forEach((target) => {
        if (typeof target.focus === "function") target.focus();
      });
    }
  };
  var actions$5 = { focus: Focus.actionFor("focus") };
  var Form = class extends ActionBase {
    requestSubmit() {
      this.targets.forEach((target) => {
        const form = target instanceof HTMLFormElement ? target : target.form || null;
        if (form) form.requestSubmit();
      });
    }
    reset() {
      this.targets.forEach((target) => target instanceof HTMLFormElement && target.reset());
    }
  };
  var actions$4 = {
    submit: Form.actionFor("requestSubmit"),
    reset: Form.actionFor("reset")
  };
  var Reload = class extends ActionBase {
    reload() {
      this.targets.forEach((target) => {
        if (this.#reloadable(target)) target.reload();
      });
    }
    get targets() {
      if (this.target === "window") return [window.location];
      return super.targets;
    }
    #reloadable(target) {
      return typeof target.reload === "function";
    }
  };
  var reload = Reload.actionFor("reload");
  var actions$3 = {
    reload,
    refresh: reload
  };
  var ScrollTo = class extends ActionBase {
    constructor(element, options = {}) {
      super(element, options);
      const validBehaviors = [
        "auto",
        "instant",
        "smooth"
      ];
      const behavior = options.value;
      this.behavior = validBehaviors.includes(behavior) ? behavior : "auto";
    }
    scroll() {
      this.targets[0]?.scrollIntoView({ behavior: this.behavior });
    }
  };
  var actions$2 = { scrollTo: ScrollTo.actionFor("scroll") };
  var Style = class extends ActionBase {
    constructor(element, options = {}) {
      super(element, options);
      const [prop, value] = (options.value || "").split("=");
      this.styleProperty = prop;
      this.styleValue = value;
    }
    set() {
      if (!this.styleProperty) return;
      this.targets.forEach((target) => target.style.setProperty(this.styleProperty, this.styleValue || ""));
    }
    remove() {
      if (!this.styleProperty) return;
      this.targets.forEach((target) => target.style.removeProperty(this.styleProperty));
    }
    cycle() {
      if (!this.styleValue) return;
      this.targets.forEach((target) => {
        const current = target.style.getPropertyValue(this.styleProperty);
        const next = this.cycledValue(current, this.styleValue);
        target.style.setProperty(this.styleProperty, next);
      });
    }
    toggle() {
      if (!this.styleProperty) return;
      this.targets.forEach((target) => {
        if (target.style.getPropertyValue(this.styleProperty) !== "") target.style.removeProperty(this.styleProperty);
        else target.style.setProperty(this.styleProperty, this.styleValue || "");
      });
    }
  };
  var actions = {
    attribute: attributeActions,
    class: actions$9,
    clipboard: actions$8,
    confirm: actions$7,
    dataAttribute: dataAttributeActions,
    dialog: actions$6,
    focus: actions$5,
    form: actions$4,
    reload: actions$3,
    scrollTo: actions$2,
    style: {
      setStyle: Style.actionFor("set"),
      removeStyle: Style.actionFor("remove"),
      cycleStyle: Style.actionFor("cycle"),
      toggleStyle: Style.actionFor("toggle")
    }
  };
  var availableActions = (groups = []) => {
    if (groups.length === 0) return Object.values(actions).reduce((all, group) => ({
      ...all,
      ...group
    }), {});
    return groups.reduce((selectedActions, group) => {
      const groupActions = actions[group];
      if (!groupActions) {
        console.warn(`Action "${group}" not found`);
        return selectedActions;
      }
      return {
        ...selectedActions,
        ...groupActions
      };
    }, {});
  };
  var actions_default = availableActions([]);
  var onceTracker = /* @__PURE__ */ new WeakSet();
  var intersectionObservers = /* @__PURE__ */ new WeakMap();
  var whenIntersecting = (check) => (element, trigger) => {
    let observers = intersectionObservers.get(element);
    if (!observers) {
      observers = /* @__PURE__ */ new Map();
      intersectionObservers.set(element, observers);
    }
    observers.get(check)?.disconnect();
    const observer = new IntersectionObserver((entries) => {
      if (check(entries)) trigger();
    });
    observers.set(check, observer);
    observer.observe(element);
  };
  var builtinTriggers = {
    mounted: (_, trigger) => {
      queueMicrotask(trigger);
    },
    now: (_, trigger) => {
      trigger();
    },
    whenVisible: whenIntersecting((entries) => entries.some((entry) => entry.isIntersecting)),
    whenInView: whenIntersecting((entries) => entries[0].isIntersecting)
  };
  var builtinGates = {
    whenOutside: (element, { event }) => {
      if (typeof element.checkVisibility === "function" && !element.checkVisibility()) return false;
      return !element.contains(event.target);
    },
    once: (element) => {
      if (onceTracker.has(element)) return false;
      onceTracker.add(element);
      return true;
    },
    preventDefault: (element, { event }) => {
      event.preventDefault();
      return true;
    },
    stopPropagation: (element, { event }) => {
      event.stopPropagation();
      return true;
    }
  };
  var allBuiltinActions = actions_default;
  Attractive.activate = function(options = {}) {
    const attractive = new this(options);
    attractive.activate({
      ...options,
      addActions: {
        ...allBuiltinActions,
        ...options.addActions
      },
      addGates: {
        ...builtinGates,
        ...options.addGates
      },
      addTriggers: {
        ...builtinTriggers,
        ...options.addTriggers
      }
    });
    return attractive;
  };
  if (typeof document !== "undefined" && typeof window !== "undefined" && (document.currentScript ?? document.querySelector('script[src*="attractive"][activate]'))?.hasAttribute("activate")) {
    window.Attractive = Attractive;
    document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => Attractive.activate()) : Attractive.activate();
  }
  var src_default = Attractive;

  // attract.js
  var Debug2 = class {
    static enabled = false;
    static prefix = "\u{1F9F2} ";
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
  var Template = class {
    constructor(templateId) {
      this.source = templateId ? document.getElementById(templateId) : null;
      if (templateId && !this.source) Debug2.warn(`Attract: template "#${templateId}" not found`);
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
  var append = positionAction("append");
  var prepend = positionAction("prepend");
  var replace = positionAction("replace");
  var before = positionAction("before");
  var after = positionAction("after");
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
  var csrf = {
    header: null,
    token: null
  };
  function respond(json, { registry }) {
    const actions2 = Array.isArray(json) ? json : json.actions ? json.actions : [json];
    for (const item of actions2) {
      const [name, ...rest] = item.action.split("#");
      const value = rest.join("#");
      if (item.template) {
        if (!item.data) Debug2.warn(`Response: "template" without "data"`);
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
        Debug2.warn(`Response: unknown action "${name}"`);
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
  var Form2 = class {
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
      const method = (this.form.querySelector('input[name="_method"]')?.value || this.form.getAttribute("method") || "post").toUpperCase();
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
  var forms = /* @__PURE__ */ new WeakMap();
  function attract({ instance, registry }) {
    registry.addAction("append", append);
    registry.addAction("prepend", prepend);
    registry.addAction("replace", replace);
    registry.addAction("before", before);
    registry.addAction("after", after);
    registry.addAction("remove", remove);
    instance.onElementAdded((element) => {
      const attract2 = element.getAttribute("@attract");
      if (element.tagName === "FORM" && attract2 !== null) {
        if (forms.has(element)) return;
        const cleanup = new Form2({
          form: element,
          registry
        }).submit();
        forms.set(element, cleanup);
        return;
      }
      if (attract2 !== null) element.querySelectorAll("form").forEach((form) => {
        if (forms.has(form)) return;
        const cleanup = new Form2({
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

  // request.js
  var Debug3 = class {
    static enabled = false;
    static prefix = "\u{1F9F2} ";
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
  var SCOPE_PROPERTY2 = "__attractiveScope";
  function scopeOf2(element) {
    let node = element;
    while (node && node.nodeType === 1) {
      if (node[SCOPE_PROPERTY2]) return node;
      node = node.parentElement;
    }
    return document;
  }
  var ActionBase2 = class {
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
      const scope = scopeOf2(this.element);
      if (this.targetsSelector) return Array.from(scope.querySelectorAll(this.targetsSelector));
      if (this.target) {
        const target = scope.querySelector(`[id="${this.target}"]`);
        if (!target) Debug3.warn(`Target "#${this.target}" not found`);
        return target ? [target] : [];
      }
      return [this.element];
    }
    cycledValue(currentValue, nextValues) {
      const values = Array.isArray(nextValues) ? nextValues : nextValues.split(",").map((value) => value.trim());
      return values[(values.indexOf(currentValue) + 1) % values.length];
    }
  };
  var csrf2 = {
    header: null,
    token: null
  };
  var delay2 = () => {
    let timeoutId;
    return (callback, delay3) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(callback, delay3);
    };
  };
  var clearFeedback2 = delay2();
  var requests = /* @__PURE__ */ new WeakMap();
  var activeRequests = {
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
    clearFeedback2(() => {
      targets.forEach((target) => target.removeAttribute("data-request-success"));
    }, parseInt(duration));
  }
  function crossingOrigin({ for: url }) {
    try {
      return new URL(url, window.location.href).origin !== window.location.origin;
    } catch {
      Debug3.error("Invalid URL:", url);
      return false;
    }
  }
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
        Debug3.warn("No URL provided in the action value");
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
      if (crossingOrigin({ for: this.#url })) Debug3.warn(`Cross-origin request to: ${this.#url}. Missing the correct CORS headers.`);
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
  var Request = class extends ActionBase2 {
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
        Debug3.warn("No URL provided in the action value");
        return;
      }
      if (crossingOrigin({ for: this.value })) Debug3.warn(`Cross-origin request to: ${this.value}. Missing the correct CORS headers.`);
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
      if (csrf2.token) headers[csrf2.header] = typeof csrf2.token === "function" ? csrf2.token() : csrf2.token;
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

  // runtime/debug.js
  var Debug4 = class {
    static enabled = false;
    static prefix = "\u{1F9F2} ";
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
  var debug_default = Debug4;

  // runtime/addons/template.js
  var Template2 = class {
    constructor(templateId) {
      this.source = templateId ? document.getElementById(templateId) : null;
      if (templateId && !this.source) {
        debug_default.warn(`Attract: template "#${templateId}" not found`);
      }
    }
    render({ with: data, target, targets: selector, position }) {
      const targetElements = this.#targets({ target, targets: selector });
      if (!targetElements.length) return [];
      if (position === "remove") {
        targetElements.forEach((element) => element.remove());
        return [];
      }
      if (!this.source) return [];
      const items = Array.isArray(data) ? data : [data];
      const results = [];
      targetElements.forEach((targetElement) => {
        items.forEach(
          (item) => results.push(
            this.#renderIn({
              target: targetElement,
              item,
              position
            })
          )
        );
      });
      return results;
    }
    // private
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
      this.#snapshot({ template, with: item });
      this.#insert({ template, target, at: position });
      return template;
    }
    #snapshot({ template, with: data }) {
      if (!data) return;
      for (const [key, value] of Object.entries(data)) {
        const elements = [];
        if (template.getAttribute("attract-field") === key) {
          elements.push(template);
        }
        elements.push(...template.querySelectorAll(`[attract-field="${key}"]`));
        for (const element of elements) {
          this.#setValue(element, value);
        }
      }
    }
    #setValue(element, value) {
      const tag = element.tagName;
      const type = (element.getAttribute("type") || "").toLowerCase();
      if (type === "checkbox" || type === "radio" || tag === "OPTION") {
        if (typeof value === "boolean") {
          if (tag === "OPTION") {
            element.selected = value;
          } else {
            element.checked = value;
          }
        } else {
          element.value = value ?? "";
        }
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

  // runtime/addons/response.js
  function respond2(json, { registry }) {
    const actions2 = Array.isArray(json) ? json : json.actions ? json.actions : [json];
    for (const item of actions2) {
      const [name, ...rest] = item.action.split("#");
      const value = rest.join("#");
      if (item.template) {
        if (!item.data) {
          debug_default.warn(`Response: "template" without "data"`);
        } else {
          new Template2(item.template).render({
            with: item.data,
            target: item.target,
            targets: item.targets,
            position: name
          });
        }
        continue;
      }
      const action = registry.getAction(name);
      if (!action) {
        debug_default.warn(`Response: unknown action "${name}"`);
        continue;
      }
      const element = item.target ? document.getElementById(item.target) : item.targets ? document.querySelector(item.targets) : null;
      action(element, {
        value: value || item.value || null,
        target: item.target,
        targets: item.targets,
        dataset: {},
        data: item.data ?? null
      });
    }
  }

  // entry.js
  var SetAttributes = class extends Action {
    run() {
      const { data, target, targets } = this.options;
      if (!data) return;
      for (const root of this.#roots({ target, targets })) {
        this.#setLink({ on: root, with: data });
        this.#setIcon({ on: root, with: data });
        this.#setVariant({ on: root, with: data });
        this.#setConfirm({ on: root, with: data });
      }
    }
    // private
    #roots({ target, targets }) {
      if (targets) return Array.from(document.querySelectorAll(targets));
      if (target) {
        const element = document.getElementById(target);
        return element ? [element] : [];
      }
      return [];
    }
    #setLink({ on, with: data }) {
      if (!data.href) return;
      const link = on.matches("[attract-href]") ? on : on.querySelector("[attract-href]");
      if (link) link.setAttribute("href", data.href);
    }
    #setIcon({ on, with: data }) {
      if (!data.icon) return;
      const icon = on.querySelector("[attract-icon]");
      if (icon) icon.innerHTML = data.icon;
    }
    #setVariant({ on, with: data }) {
      if (!data.variant) return;
      const action = on.matches("[attract-variant]") ? on : on.querySelector("[attract-variant]");
      if (action) action.classList.add(`action--${data.variant}`);
    }
    #setConfirm({ on, with: data }) {
      if (!data.confirm) return;
      const form = on.matches("form[attract-confirm]") ? on : on.querySelector("form[attract-confirm]");
      if (!form || form.dataset.confirmBound) return;
      form.dataset.confirmBound = "true";
      form.dataset.confirm = data.confirm;
      form.addEventListener("submit", (event) => {
        if (window.confirm(data.confirm)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
      }, true);
    }
  };

  // index.js
  var extension = ({ registry }) => {
    get.onJSON = (json) => respond2(json, { registry });
  };
  var setAttributes = (element, options) => new SetAttributes(element, options).run();
  src_default.activate({
    extendWith: [attract, extension],
    addActions: { get, setAttributes }
  });
})();
