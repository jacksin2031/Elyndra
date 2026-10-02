import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hashDiagnosticText, translationRepairDiagnosticSamples } from "../src/locale-diagnostics.js";

test("translation diagnostics retain only stable path, length, and hash metadata", () => {
  const prose = "A player-authored secret that must not enter diagnostic logs";
  const samples = translationRepairDiagnosticSamples([prose, "次の行", "third", "ignored"]);
  assert.deepEqual(samples, [
    { path: "translations[0]", length: prose.length, hash: hashDiagnosticText(prose) },
    { path: "translations[1]", length: 3, hash: hashDiagnosticText("次の行") },
    { path: "translations[2]", length: 5, hash: hashDiagnosticText("third") },
  ]);
  assert.match(samples[0].hash, /^[0-9a-f]{8}$/);
  assert.equal(JSON.stringify(samples).includes(prose), false);
  assert.equal(JSON.stringify(samples).includes("次の行"), false);
  assert.equal(hashDiagnosticText(prose), "862c03e9");
});

test("locale repair app logging calls the metadata-only sampler", () => {
  const app = readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.match(app, /samples:translationRepairDiagnosticSamples\(left\.strings\)/);
  assert.doesNotMatch(app, /samples:left\.strings\.slice\(0,3\)\.map\(x=>x\.slice/);
});