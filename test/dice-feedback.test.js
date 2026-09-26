import test from "node:test";
import assert from "node:assert/strict";
import { createDiceFeedback } from "../src/dice-feedback.js";

function element() {
  const names = new Set();
  const attrs = new Map();
  return {
    classList: {
      add: (...items) => items.forEach((item) => names.add(item)),
      remove: (...items) => items.forEach((item) => names.delete(item)),
      contains: (item) => names.has(item),
    },
    dataset: {},
    textContent: "",
    layoutFlushes: 0,
    get offsetWidth() { this.layoutFlushes += 1; return 1; },
    setAttribute: (key, value) => attrs.set(key, value),
    removeAttribute: (key) => attrs.delete(key),
    hasAttribute: (key) => attrs.has(key),
    getAttribute: (key) => attrs.get(key),
  };
}
function harness(prefersReducedMotion = false) {
  const box = element(), value = element(), jobs = new Map(), cancelled = [];
  const motion = { reduced: prefersReducedMotion };
  let nextId = 1;
  const feedback = createDiceFeedback({
    box, value, reducedMotion: () => motion.reduced,
    schedule: (callback, delay) => { const id = nextId++; jobs.set(id, { callback, delay }); return id; },
    cancel: (id) => cancelled.push(id),
  });
  return { box, value, jobs, cancelled, feedback, motion };
}

test("shows the Engine natural roll and finishes its feedback timer", () => {
  const h = harness(), roll = { natural: 17, total: 19, dc: 14, grade: "SUCCESS", success: true };
  const original = structuredClone(roll);
  h.feedback.play(roll);
  assert.equal(h.value.textContent, "17");
  assert.deepEqual(roll, original);
  assert.equal(h.box.dataset.outcome, "success");
  assert.equal(h.box.classList.contains("rolling"), true);
  assert.equal(h.box.layoutFlushes, 1);
  assert.equal(h.box.getAttribute("aria-busy"), "true");
  const job = [...h.jobs.values()][0];
  assert.equal(job.delay, 1100);
  job.callback();
  assert.equal(h.box.classList.contains("rolling"), false);
  assert.equal(h.box.classList.contains("settled"), true);
  assert.equal(h.box.hasAttribute("aria-busy"), false);
});

test("explicit failure wins over a high total on a critical 1", () => {
  const h = harness();
  h.feedback.play({ natural: 1, total: 30, dc: 12, grade: "CRITICAL_FAILURE", success: false });
  assert.equal(h.box.dataset.outcome, "critical-failure");
  assert.equal(h.box.classList.contains("roll-fail"), true);
  assert.equal(h.box.classList.contains("roll-critical"), true);
});

test("critical-success grade wins over a low total on a natural 20", () => {
  const h = harness();
  h.feedback.play({ natural: 20, total: 2, dc: 18, grade: "CRITICAL_SUCCESS" });
  assert.equal(h.box.dataset.outcome, "critical-success");
  assert.equal(h.box.classList.contains("roll-success"), true);
});

test("contradictory success bool suppresses the critical class", () => {
  const h = harness();
  h.feedback.play({ natural: 20, total: 2, dc: 18, grade: "CRITICAL_SUCCESS", success: false });
  assert.equal(h.box.dataset.outcome, "failure");
  assert.equal(h.box.classList.contains("roll-fail"), true);
  assert.equal(h.box.classList.contains("roll-critical"), false);
});

test("a stale callback cannot clear the newer roll state", () => {
  const h = harness();
  h.feedback.play({ natural: 4, total: 5, dc: 12, grade: "FAILURE", success: false });
  const oldJob = [...h.jobs.values()][0];
  h.feedback.play({ natural: 16, total: 18, dc: 12, grade: "SUCCESS", success: true });
  assert.equal(h.box.layoutFlushes, 2);
  const newJob = [...h.jobs.values()][1];
  oldJob.callback();
  assert.equal(h.value.textContent, "16");
  assert.equal(h.box.classList.contains("rolling"), true);
  assert.equal(h.box.getAttribute("aria-busy"), "true");
  newJob.callback();
  assert.equal(h.box.classList.contains("settled"), true);
});

test("reduced motion settles immediately without scheduling", () => {
  const h = harness(true);
  h.feedback.play({ natural: 8, total: 13, dc: 12 });
  assert.equal(h.box.dataset.outcome, "success");
  assert.equal(h.box.classList.contains("rolling"), false);
  assert.equal(h.box.classList.contains("settled"), true);
  assert.equal(h.jobs.size, 0);
  assert.equal(h.box.hasAttribute("aria-busy"), false);
});

test("normal then reduced-motion play clears busy and ignores the forced stale callback", () => {
  const h = harness();
  h.feedback.play({ natural: 10, total: 14, dc: 12, success: true });
  const oldJob = [...h.jobs.values()][0];
  h.motion.reduced = true;
  h.feedback.play({ natural: 3, total: 4, dc: 12, success: false });
  assert.equal(h.cancelled.length, 1);
  assert.equal(h.value.textContent, "3");
  assert.equal(h.box.hasAttribute("aria-busy"), false);
  assert.equal(h.box.classList.contains("rolling"), false);
  assert.equal(h.box.classList.contains("settled"), true);
  oldJob.callback();
  assert.equal(h.box.dataset.outcome, "failure");
  assert.equal(h.box.classList.contains("settled"), true);
  assert.equal(h.box.hasAttribute("aria-busy"), false);
  assert.equal(h.box.layoutFlushes, 1);
});

test("reset and dispose cancel timers and clear feedback state", () => {
  const h = harness();
  h.feedback.play({ natural: 9, total: 14, dc: 12 });
  h.feedback.reset();
  assert.equal(h.cancelled.length, 1);
  assert.equal(h.value.textContent, "20");
  assert.equal(h.box.classList.contains("rolling"), false);
  assert.equal(h.box.dataset.outcome, undefined);
  assert.equal(h.box.hasAttribute("aria-busy"), false);
  h.feedback.play({ natural: 1, grade: "CRITICAL_FAILURE", success: false });
  h.feedback.dispose();
  assert.equal(h.value.textContent, "20");
  assert.equal(h.box.dataset.outcome, undefined);
  assert.equal(h.box.classList.contains("roll-critical"), false);
  h.feedback.play({ natural: 20, grade: "CRITICAL_SUCCESS", success: true });
  assert.equal(h.jobs.size, 2);
});
