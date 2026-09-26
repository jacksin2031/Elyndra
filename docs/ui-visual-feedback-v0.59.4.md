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
- Focused release regressions: 34/34 PASS, including 8 dice-feedback tests covering real results, critical outcomes, timer races, reduced motion and reset/dispose, plus the 2 existing viewport/frame stability tests.
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

## Full-interface background extension

The user's subsequent screenshot was checked against the actual Pages site: it still served v0.59.3 with cache token 59003, while this unmerged PR contains v0.59.4. That explains why the old headline and missing icons remained visible online.

`world-surfaces.css` owns decorative surface styles separately from layout. `#worldBackdrop` is fixed to the viewport and has no pointer interaction or layout dimensions of its own. It reuses the current genre image and focal position with aspect-preserving `cover`. The HUD, stats, quest, NPC dock, narrator, action and dice panels, top/bottom navigation, modal cards and NPC chat surfaces receive a local SVG material at fixed tile sizes. Modal artwork replaces the old stretched atlas layer. More/free-action/system-menu icons use local vector artwork. Success/failure/critical border colors remain distinct.

The existing desktop 1720 × 860 stage and mobile/tablet flow were retained. A same-page baseline resize sequence returned to exactly the original 1440 × 900 relative panel coordinates; narrow action containers remained scrollable and the last option passed hit testing. Backgrounds may crop with the viewport aspect ratio, and the layout intentionally reflows below 901px; imagery is never distorted to match the container.

The cache contract now also validates `creator.css` and `world-surfaces.css` when changed, so the new stylesheet cannot retain an old release token unnoticed.

Extension validation uses an imported synthetic offline world in installed Chrome:

- A continuous 11-step resize sequence (1440 × 900 through desktop, short landscape, tablet and 320 × 720 phone sizes, then back to 1440 × 900) has no horizontal document overflow. The fixed backdrop exactly matches the viewport at every step; returning to 1440 × 900 restores identical relative panel coordinates.
- Etching remains a fixed 208px or 192px repeating tile. All five genre fixtures resolve the same matching artwork in the scene and full-screen backdrop.
- A 24-size Japanese landing sweep from 320 to 1920px, including layout breakpoints, has no document/header overflow, zero headline/feature left-edge difference and no split within `あなた`.
- Character/inventory and system-menu artwork was visually inspected. The synthetic fixture has no clickable NPC, so opening an NPC conversation for this background extension was NOT RUN.
- The original drawer/sheet translation could briefly exceed the viewport during breakpoint changes. Modal entry now uses a shared opacity-only fade, with animation disabled for reduced motion.
- After the fade fix, opening and continuously resizing the same character modal at 1440 × 900, 900 × 600 and 390 × 844 produced 10 contained measurements, both two frames after changes and after settling. Close-button hit testing and dismissal passed. Reduced motion computed to `animation: none`.
- All nine system-menu entries have visible 20 × 20 icon boxes and readable labels; their local SVG requests returned HTTP 200. A viewport-only phone capture confirms the top bar starts at y=0 and the backdrop covers all 390 × 844 pixels.

These measurements allow intentional responsive reflow and aspect-ratio cropping; they do not claim identical scenery crops at different window shapes.
