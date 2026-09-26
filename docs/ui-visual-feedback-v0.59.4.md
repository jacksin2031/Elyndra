# v0.59.4 UI visual feedback

Base: `origin/main` at `9c0fdbd` (merged v0.59.3 UI and locale fixes).

## Changes

- Align the landing headline, description, buttons and feature cards to the same left edge. Reduce the headline's maximum font size and widen its column. Use Japanese phrase-aware wrapping with normal responsive text flow.
- Add six local vector illustrations for navigation, feature cards and the D20. Text labels remain visible.
- Add the original 174 KB astral-gate background to the existing world-generation progress panel. Stage text and percentages still come from the existing compiler callbacks. The animation stops on failure, while awaiting contract confirmation, and when generation finishes.
- Show a compact game activity row during actual AI, state-sync or player-action work. Only the existing AI timer produces elapsed seconds. The row disappears when these operations finish.
- Animate the actual Engine D20 result for 1.1 seconds, followed by a settling glow. Explicit Engine success and critical grades take priority over the total/DC comparison. Animation does not modify dice, delay game execution, or invent intermediate random results.
- Cancel stale animation callbacks on repeated rolls or world replacement. Reset both die and explanatory text when replacing a world. Reduced-motion users receive the result immediately without animation.

Artwork provenance and the exact generation prompt are in [ARTWORK.md](../assets/ui/ARTWORK.md).

## Validation

- Version contract, JavaScript syntax (126 files), static i18n coverage (495 keys): PASS.
- Focused release regressions: 32/32 PASS, including 8 dice-feedback tests covering real results, critical outcomes, timer races, reduced motion and reset/dispose.
- Full suite: 817 tests, 790 passed, 27 failed, 0 skipped. The same 27 failure names existed before these UI changes; no newly failing tests. This is not a clean full-suite pass.
- The narrator/action invariant now checks direct HTML adjacency instead of the number of source characters in the narrative panel. The loading row precedes the narrator within that panel.
- Browser and cache-contract results are recorded below after final verification.

## Evidence boundary

Browser validation uses isolated Chrome contexts, a synthetic imported world and mocked local API failures. No paid provider or live generated world is required or claimed. The installed Chrome viewport checks are not physical phone or Safari/Firefox validation. Publication remains subject to PR review and the existing Pages workflow.
