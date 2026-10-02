import test from "node:test";
import assert from "node:assert/strict";
import { initWorldStyleLibrary } from "../src/world-style-library.js";
import { WORLD_STYLE_ART_CATALOG } from "../src/world-style-art.js";

class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = String(tagName).toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.style = {};
    this.hidden = false;
    this.value = "";
    this.type = "";
    this._textContent = "";
    this._className = "";
    this.classList = {
      add: (...names) => this._changeClasses((current) => [...new Set([...current, ...names])]),
      remove: (...names) => this._changeClasses((current) => current.filter((name) => !names.includes(name))),
      contains: (name) => this._classes().includes(name),
      toggle: (name, force) => {
        const has = this.classList.contains(name);
        const enabled = force === undefined ? !has : Boolean(force);
        this.classList[enabled ? "add" : "remove"](name);
        return enabled;
      }
    };
  }

  get className() { return this._className; }
  set className(value) { this._className = String(value || ""); }
  get textContent() { return this._textContent + this.children.map((child) => child.textContent || "").join(""); }
  set textContent(value) { this._textContent = String(value ?? ""); this.replaceChildren(); }
  get lastElementChild() { return this.children.at(-1) || null; }
  get isConnected() { let node = this; while (node) { if (node === this.ownerDocument.body) return true; node = node.parentNode; } return false; }

  _classes() { return this._className.split(/\s+/u).filter(Boolean); }
  _changeClasses(update) { this._className = update(this._classes()).join(" "); }
  append(...nodes) {
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      node.remove?.();
      node.parentNode = this;
      this.children.push(node);
    }
  }
  appendChild(node) { this.append(node); return node; }
  insertBefore(node, reference) {
    node.remove?.();
    const index = this.children.indexOf(reference);
    node.parentNode = this;
    this.children.splice(index < 0 ? this.children.length : index, 0, node);
    return node;
  }
  replaceChildren(...nodes) { for (const child of this.children) child.parentNode = null; this.children = []; this.append(...nodes); }
  replaceWith(node) {
    const parent = this.parentNode;
    if (!parent) return;
    const index = parent.children.indexOf(this);
    this.remove();
    if (index >= 0) { node.parentNode = parent; parent.children.splice(index, 0, node); }
  }
  remove() {
    if (!this.parentNode) return;
    const siblings = this.parentNode.children;
    const index = siblings.indexOf(this);
    if (index >= 0) siblings.splice(index, 1);
    this.parentNode = null;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  removeAttribute(name) { this.attributes.delete(name); }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) || [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  click() { for (const callback of this.listeners.get("click") || []) callback({ target: this, preventDefault() {} }); }
  focus() {}
  showModal() { this.open = true; }
  close() { this.open = false; for (const callback of this.listeners.get("close") || []) callback({ target: this }); }
  getClientRects() { return []; }
  closest(selector) {
    for (let node = this; node; node = node.parentNode) {
      if (selector === "label" && node.tagName === "LABEL") return node;
      if (selector === "form" && node.tagName === "FORM") return node;
      if (selector.startsWith(".") && node.classList.contains(selector.slice(1))) return node;
    }
    return null;
  }
  contains(target) { return target === this || this.children.some((child) => child.contains(target)); }
  matches(selector) {
    if (selector === ".wsl-card") return this.classList.contains("wsl-card");
    if (selector === "input[type='search']" || selector === 'input[type="search"]') return this.tagName === "INPUT" && this.type === "search";
    return false;
  }
  querySelectorAll(selector) {
    const found = [];
    const visit = (node) => { for (const child of node.children) { if (child.matches(selector)) found.push(child); visit(child); } };
    visit(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body", this); this.activeElement = null; }
  createElement(tagName) { return new FakeElement(tagName, this); }
  getElementById(id) {
    const visit = (node) => {
      if (node.id === id) return node;
      for (const child of node.children) { const match = visit(child); if (match) return match; }
      return null;
    };
    return visit(this.body);
  }
  querySelector(selector) { return this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
}

test("Japanese style gallery renders all built-ins without runtime ReferenceErrors", () => {
  const originalGlobals = new Map(["document", "window", "localStorage", "ELYNDRA_LOCALE"].map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const doc = new FakeDocument();
  const creator = doc.createElement("form");
  creator.id = "creator";
  creator.className = "creator-console";
  const label = doc.createElement("label");
  const genre = doc.createElement("select");
  genre.id = "genre";
  genre.value = "王道奇幻";
  label.append(genre);
  creator.append(label);
  doc.body.append(creator);
  Object.assign(globalThis, {
    document: doc,
    window: { addEventListener() {} },
    localStorage: { getItem: () => "ja", setItem() {} },
    ELYNDRA_LOCALE: "ja"
  });

  let gallery;
  try {
    gallery = initWorldStyleLibrary({ onApply() {} });
    assert.ok(gallery, "gallery initialization should produce a dialog");
    assert.doesNotThrow(() => gallery.open(), "opening the Japanese gallery should render without ReferenceError");
    assert.equal(gallery.dialog.open, true);
    assert.equal(gallery.dialog.querySelectorAll(".wsl-card").length, Object.keys(WORLD_STYLE_ART_CATALOG).length);
  } finally {
    gallery?.destroy();
    for (const [key, descriptor] of originalGlobals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
