# UI/UX corrections — 29 October 2026

Base: `main` at `550dace28c60ee6c2d455a1c971e44053aaea47a`.
Scope: presentation and responsive usability. Prepared on a separate branch; no production deployment.

## Findings and corrections

- **Confirmed report overflow:** at 320 CSS pixels with the existing `xlarge` preference, Modern's forced two-column metric grid overflowed the document (310px scroll width versus 305px available). The grid now chooses one or two columns according to available space. Large amounts can wrap as a final fallback. No values are hidden or reduced.
- **Header control sizing:** Modern's 40px rules overrode the shared 44px minimum. The minimum height is now 44px, with 44px icon widths. Existing role-preview placement remains intact.
- **Mobile filter typography:** toolbar inputs/selects and dialog textareas missed the existing 16px mobile text rule. They now match other mobile form controls. This addresses readability and the small-input zoom trigger on iOS; an actual iOS device was not tested.
- **Dialog checkboxes/radios:** the blanket dialog-input rule applied text-field padding and a 46px minimum height to checkbox/radio controls. Those types are now excluded from that rule, retaining their shared control styling.
- **QA fidelity:** the existing QA frame loaded only eight manually enumerated stylesheets, in an order different from the application. It now derives all stylesheet links and their order from the production HTML, including resident-card, wide-screen and apartment refinements.
- Updated the Modern stylesheet cache key in `index.html`.

## Verification

- 31 targeted tests pass: UI/UX V4, Modern design, large screens, mobile navigation and role-preview header.
- 384 browser-rendered layout cases: widths 320, 390, 600, 768, 1024 and 1440; Classic/Modern; normal/xlarge; Turkish/German renderer language; overview, apartments, people, reports, settings, login, person form and assignment form. No page/dialog horizontal overflow after the corrections. Generated examples use synthetic demo records. This is layout verification, not end-to-end application testing.
- Visual inspection of the corrected 320px Modern report with xlarge text confirms readable full amounts in a single column.
- Full Node suite: 246 passing, 7 failing out of 253, both before and after this change. The same failures reproduce in an untouched worktree at the base commit: four load-performance fixtures, module cache-key consistency, the release-migration test (missing local PGlite dependency), and the shared-apartment statement assertion. No new failures were introduced. These pre-existing issues need separate investigation before release; no backend changes were attempted here.
- `git diff --check` passes.

## Limits

The preview's dynamic module loading failed, so browser measurements used statically rendered output of the actual UI renderers with the application stylesheets. Login, writes, invitation flows, keyboard interactions in the running application and actual mobile devices are not verified by these layout cases. Live data, accounts and Supabase settings were not modified. No merge or release is included.
