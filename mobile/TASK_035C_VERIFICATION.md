# Task 035C — Rewards interaction and polish

Date: 2026-11-16

## Delivered

- Moved About FitPoints from beside the label to the right of the balance, replacing the decorative F coin instance. It is a true 44 × 44 dp circular button with a 1 dp lime outline and centered information glyph, with focus/press feedback. Existing earning information, disclaimer and Close/Android Back/accessibility escape callbacks are preserved.
- Shop subtitle is now “Gear up. Stand out.” using the existing secondary caption style.
- Both reward cards and both merchandise cards are accessible buttons with preview hints, small chevrons, subtle pressed opacity/surface feedback and visible keyboard focus. The existing two-column layout and large-text/narrow-width stacking remain.
- Reward details show the matching local icon, reward name, sample 500 FP/1,000 FP requirement, brief concept description and Coming soon. A compact disclosure states redemption is unavailable.
- Product previews show a larger rendering of the existing local illustration, product name, short concept description and Coming soon. A compact disclosure states checkout/purchases are unavailable. No prices, stock, shipping or product specifications invented.
- Details use the existing height-bounded modal styling, fixed accessible Close control and scrollable content. Android Back dismisses via native Modal.onRequestClose; accessibility escape also dismisses. Info/details states are mutually cleared when opening the other preview. No navigation mutation or commerce/points actions are introduced.
- All modals use animationType="none". Artwork enlargement is a static transform, not animated; no new motion, transition or layout-shift animation is introduced, including for reduced-motion users.

## Verification

| Check | Result |
| --- | --- |
| `npm.cmd run typecheck` | PASS |
| `npm.cmd run lint` | PASS, no warnings/errors |
| Focused Rewards/UI/navigation tests | PASS, 176 tests across 4 suites |
| `npm.cmd test -- --watch=false` | PASS, 709 tests across 32 suites |
| `git diff --check` | PASS, only prior unrelated mobile line-ending notices |
| Empty-baseline whitespace checks | PASS for all four task files, including untracked files |
| SHA-256 preservation check | PASS: all 1,443 nonignored files outside the four task paths match the pre-task baseline |

Focused command:

```powershell
npm.cmd test -- --watch=false src/screens/RewardsScreen.test.tsx src/screens/mobileExperience.test.tsx src/navigation/navigationState.test.ts src/navigation/PrototypeNavigator.test.tsx
```

Updated/new tests verify:

- One information button directly beside the accessible balance, not beside the label; actual 44 dp dimensions; no displayed F coin; correct subtitle.
- Existing earning modal content and all dismissal paths.
- Correct icon-backed details for each reward/product, matching name, sample requirement when applicable, description, Coming soon and unavailable-action disclosure. Only Close is actionable within each details sheet.
- Card press/focus feedback and no modal animations.
- Close, onRequestClose and accessibility escape for every preview, including reopening and unchanged 1,250 FP balance, with no order/redemption/payment outcome.
- Actual App integration: Profile → Rewards, all four previews dismissed without leaving the selected Rewards tab, Profile shortcut retained, and normal Android Back to Home after sheets are closed. Existing five-tab, responsive grid, Shop and regression tests remain enabled.

An initial focus-feedback test compared two references to the same updated renderer node and failed despite correct focus styling. It was corrected to save the resting border value before focus. Both the final focused run and full regression suite pass without changing implementation to satisfy that test.

## Exact files changed

1. `mobile/src/screens/RewardsScreen.tsx`
2. `mobile/src/screens/RewardsScreen.test.tsx`
3. `mobile/src/screens/mobileExperience.test.tsx`
4. `mobile/TASK_035C_VERIFICATION.md` — new

No other screen, navigation, shared merchandise artwork, Admin Studio, backend, authentication, database, payment, package manifest or lockfile changed. All unrelated/uncommitted work preserved. No new dependencies. No earning, redemption, point deduction, purchases, checkout, inventory or shipping processing exists. Nothing staged, committed, pushed, deployed or published.

## Limitations

Native Android/iOS visual testing, physical hardware Back, screen-reader focus restoration, large-font sheet clipping, hit testing and scroll performance remain pending device review. Tests use mocked React Native hosts and invoke the native modal's Android Back callback; they do not generate physical OS Back events. No native screenshot or performance claim is made. Illustrations and all rewards/products remain fictional previews.
