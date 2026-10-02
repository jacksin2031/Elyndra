export function hashDiagnosticText(value) {
  const text = String(value ?? "");
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function translationRepairDiagnosticSamples(strings) {
  if (!Array.isArray(strings)) return [];
  return strings.slice(0, 3).map((value, index) => ({
    path: `translations[${index}]`,
    length: String(value).length,
    hash: hashDiagnosticText(value),
  }));
}