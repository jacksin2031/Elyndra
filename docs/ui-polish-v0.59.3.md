# UI polish v0.59.3

## Scope

- Keep the existing 1720 × 860 desktop canvas and deterministic game runtime.
- Place scene artwork, narration and actions in separate grid rows beside the character sidebar.
- Use normal document flow on phones and a two-column layout on tablets; show health and condition on phones.
- Improve action, quest and inventory readability, keyboard focus and touch targets.
- Reuse the existing fantasy artwork on the landing page. Keep world-creation step labels visible and navigation below form controls.
- Add screen/choice entry animations and button feedback; respect `prefers-reduced-motion`.
- Correct the modal stacking order so the game header cannot intercept the close button.

No new dependencies, AI requests, save-schema changes or game-rule changes are required. Runtime JavaScript changes only update the version import.

## Automated validation

Environment: Windows, Node.js 24.18.0. Base commit: `6242459ec489a9e823d17b4c4051e6ba6bf72284`.

| Check | Result |
| --- | --- |
| JavaScript syntax | 125 files passed |
| Focused CI, UI, viewport, asset and multilingual contracts | 29 passed, 0 failed |
| Original full suite | 806 tests: 778 passed, 28 failed |
| Updated full suite | 806 tests: 779 passed, 27 failed |
| New failures against the original suite | 0 |

The old narrator HTML assertion passes after the edited HTML uses LF line endings. The other 27 pre-existing failures remain visible; this work does not relabel the full suite as passing or rewrite unrelated historical assertions. Three current release-contract tests were updated to require v0.59.3 and its changed browser entry points.

The project is a native ES-module site with no bundler, type-check or lint scripts. Browser checks use isolated installed-Chrome contexts and a synthetic `.elyndra` fixture created with `newGame` and `migrateSave`. The save and world validators accept that fixture. External/API traffic is blocked, except for an explicitly stubbed offline health response. These checks demonstrate UI rendering and interaction, not live-provider gameplay.

Local evidence is retained in `output/ui/` (test logs/comparison and synthetic fixture) and `output/playwright/` (screenshots and browser measurements). These generated artifacts are not part of the release commit.

## Chrome rendering and interaction

| Viewport | Horizontal overflow | Result |
| --- | --- | --- |
| 320 × 720 | None | Title, narration and actions remain in normal document flow |
| 390 × 844 | None | Health, condition and objective visible; actions reachable by scrolling |
| 820 × 1180 | None | Sidebar and scene occupy separate columns |
| 1280 × 720 | None | Free-action input and send button fit inside the fixed stage |
| 1440 × 900 | None | Narration/actions stay beside the sidebar; input and send button fit |

Long desktop action lists have their own scrollbar. The final action remains reachable and the input/send controls accept focus. The send-button hit test intercepts the click before submission; no game action or paid AI request is submitted. AI-settings and inventory drawers close through real pointer clicks at 820 and 1440 pixels, without forced clicks. No uncaught browser errors or external requests were recorded in the final rendering matrix.

Evidence: `after-final-summary.json` for phone/tablet rendering, `after-desktop-actions.json` for the final desktop correction, and `after-modal-close.json` for modal hit testing. Earlier screenshots and measurements remain available as baseline/intermediate evidence and must not be mistaken for final results.

The final short checks also confirm:

- At 320 pixels, all five creation-step labels remain visible at 12px. Steps 1–4 have readable labels and native controls; their static navigation rows do not overlap controls.
- Screen/creator entry, scene atmosphere and choice-entry animations run in normal mode. All four report `animation-name: none` and duration `0s` with reduced motion enabled.
- Keyboard Tab reaches the new-world button with a visible 2px focus outline. Action hover/press feedback works without submitting a turn.
- PR-mode version and base-relative cache checks pass for v0.59.3.

Final CSS SHA-256: `865574BAFA24859C36C0C5ACAE737DD04E8727E1F9BD444CED7FB9C805FABC13`. Short-check evidence: `after-final-shortchecks.json`.
