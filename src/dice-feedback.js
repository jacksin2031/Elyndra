export function createDiceFeedback({
  box,
  value,
  reducedMotion = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false,
  schedule = setTimeout,
  cancel = clearTimeout,
}) {
  let timer = null;
  let generation = 0;
  let disposed = false;
  const classes = ["rolling", "roll-success", "roll-fail", "roll-critical", "settled"];

  const stopTimer = () => {
    if (timer !== null) cancel(timer);
    timer = null;
  };
  // reset() clears presentation state and restores the idle die label to 20.
  const reset = () => {
    generation += 1;
    stopTimer();
    box.classList.remove(...classes);
    delete box.dataset.outcome;
    box.removeAttribute("aria-busy");
    value.textContent = "20";
  };

  const play = (roll) => {
    if (disposed) return;
    generation += 1;
    const token = generation;
    stopTimer();
    box.classList.remove(...classes);
    box.removeAttribute("aria-busy");
    delete box.dataset.outcome;
    value.textContent = String(roll?.natural ?? "—");

    const grade = String(roll?.grade ?? "").toUpperCase();
    const criticalSuccess = grade === "CRITICAL_SUCCESS";
    const criticalFailure = grade === "CRITICAL_FAILURE";
    const hasExplicitGrade = ["SUCCESS", "CRITICAL_SUCCESS", "FAILURE", "CRITICAL_FAILURE"].includes(grade);
    const hasThreshold = roll?.total != null && roll?.dc != null &&
      Number.isFinite(Number(roll.total)) && Number.isFinite(Number(roll.dc));
    const success = typeof roll?.success === "boolean"
      ? roll.success
      : hasExplicitGrade
        ? grade === "SUCCESS" || criticalSuccess
        : hasThreshold && Number(roll.total) >= Number(roll.dc);
    const criticalOutcome = (criticalSuccess || criticalFailure) &&
      (typeof roll?.success !== "boolean" || roll.success === criticalSuccess);

    box.classList.add(success ? "roll-success" : "roll-fail");
    if (criticalOutcome) box.classList.add("roll-critical");
    box.dataset.outcome = criticalOutcome
      ? success ? "critical-success" : "critical-failure"
      : success ? "success" : "failure";

    if (reducedMotion()) {
      box.classList.add("settled");
      return;
    }
    // Flush removal of the previous class so a rapid reroll restarts its keyframe.
    void box.offsetWidth;
    box.classList.add("rolling");
    box.setAttribute("aria-busy", "true");
    timer = schedule(() => {
      if (disposed || token !== generation) return;
      timer = null;
      box.classList.remove("rolling");
      box.classList.add("settled");
      box.removeAttribute("aria-busy");
    }, 1100);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    reset();
  };

  return { play, reset, dispose };
}
