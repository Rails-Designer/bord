import { Action } from "./attractive.js";

export default class SetAttributes extends Action {
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
}
