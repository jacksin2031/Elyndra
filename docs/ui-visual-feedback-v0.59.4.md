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
- Cache contract against `main`: PASS (`59004`; impacted modules: app, dice-feedback, version).
- GitHub Actions for implementation commit `e826f11`: PASS ([run 1058](https://github.com/A24DC523/Elyndra/actions/runs/36250179095)). Deployment is skipped for pull requests.
- Chrome landing matrix: Japanese, English and Traditional Chinese at widths 320, 390, 820, 1440 and 1842; all 15 cases have document width equal to viewport width and zero difference between headline/feature left edges. Japanese character-range measurements keep `あなた` on one line.
- Real UI world creation: advanced through steps 1–5 with mocked health and two delayed `/api/world` HTTP 500 responses. Loading displayed at the real compiler stage (42%); after each failure it stopped, reset to 0%, and re-enabled generation. Retry worked.
- Real offline game action: D20 19 matched `D20 19 + 1 = 20 / DC 12`. Chrome captured `rolling` with `diceTumble`, duration 1.1s and running play state, then `settled` with no ongoing die animation.
- Game activity states were tested by appending test-only function access to the served module in an isolated browser context (no source changes). AI work, state sync and player-action work each showed the activity row while pending and hid it after completion.
- Reduced-motion context: actual game action displayed its Engine result immediately; die and loading animations were both `none`.
- At 390 × 844, the final choice and free-action submit button can be scrolled fully above the fixed bottom navigation; center hit tests reach the intended buttons. Desktop and mobile SVG icons were visually checked after fixing the inherited transparent sprite color.
- Browser errors: 0. External requests: 0. World API calls were mock failures; no real AI generation or provider E2E was performed.

## Evidence boundary

Browser validation uses isolated Chrome contexts, a synthetic imported world and mocked local API failures. No paid provider or live generated world is required or claimed. The installed Chrome viewport checks are not physical phone or Safari/Firefox validation. Publication remains subject to PR review and the existing Pages workflow.

## Existing follow-up

Read-only review found an existing global AI-busy ownership risk: an old world's NPC/action request can call `setAIThinking(false)` in its `finally` after a new world's translation has started. The new activity row mirrors the existing busy state; this change does not add request ownership or resolve that cross-session race. A separate runtime change should use a task/session lease and add overlapping-request regression coverage. The dice controller's own callbacks are generation-guarded independently.
