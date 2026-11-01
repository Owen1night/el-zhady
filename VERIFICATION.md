# Verification — 2026-11-01

## Repository inspection and preservation

Inspected `/workspace` and the existing `/workspace/el-zhady` checkout before writing. The checkout contained its Git history/remote and only `README.md` with `# el-zhady`. Kept the repository, remote, branch and README heading. No existing application was overwritten. No commits were pushed and no repository or hosting access settings were changed.

## Commands actually run

- Dependency installation completed with npm and produced `package-lock.json`. The first sandboxed attempt could not reach the proxy; installation succeeded with network-enabled execution.
- `npm run check` — passed TypeScript and editorial structure checks.
- `npm test` — passed. Also directly ran the test module with `node --import tsx src/lib/public-url.test.ts`; both named cases passed (public URL gating and nested unsourced-answer rejection).
- `npm run build` — passed; Vite emitted `dist/` with relative assets, bundled Kazakh-capable fonts and font-license copies.
- `git diff --check` — passed.
- Runtime used for these checks: Node 24.19.0, npm 11.9.0. README and CI target Node 22; Node 22 was not executed in this environment.

The initial `tsx` CLI invocation failed because its IPC socket was blocked (`EPERM`). Changed scripts to `node --import tsx`, avoiding that socket; final commands passed.

## Browser checks actually performed

Used installed Chromium through Playwright. Inspected full-page desktop (1440px), mobile (360px) and presentation (1920px) screenshots. Screenshots freeze finite entrance animations at their final state. These are browser-emulated viewports, not physical devices.

- All 11 routes rendered at 1440, 768, 390 and 360 CSS pixels with no horizontal page overflow.
- All 11 routes also checked at 360px in presentation mode, without horizontal overflow.
- One main heading per section; unknown hash route shows a working recovery link.
- Mobile menu opens, exposes all 11 sections, navigates on touch, closes with Escape and restores focus.
- Keyboard skip link focuses main content without changing the hash route.
- Tab wrapping keeps focus inside the navigation dialog; dialogs open/close and fit at 360px.
- All five activity **planning** dialogs open and close. These are not game tests and no playable game completion is claimed.
- Period buttons update pressed state and planning text.
- Presentation preference survives reload. Confirmed reset clears this app's previous visited list and presentation preference; the current Results visit is recorded again. Visits are labelled as navigation history, not grades.
- Blocked localStorage test shows the session-only fallback message without crashing.
- Unconfigured share dialog displays an honest notice; no QR, localhost public link or invented public URL appears.
- Reduced-motion emulation disables the cover animation and smooth scrolling.
- Served the actual production `dist/` from a plain static server under `/repository-name/`. Direct load and refresh of `/repository-name/#/timeline` worked. All 11 production sections worked at 360px; no failed asset requests or JavaScript page errors were observed.
- Visible shell buttons on the 11 production pages measured at least 44×44 CSS pixels.
- 1920px presentation screenshot checked; main descriptive text enlarges to 20px.

Browser testing found a missing accessible name on the collapsed menu and focus escaping at the end of a dialog tab sequence. Added an explicit menu label and dialog focus wrapping. Final browser runs passed with no page errors. A preliminary browser script also had an assertion typo; it was corrected before the final run.

## Limits and unfinished work

No physical iPhone/Safari or Android/Chrome test, WebKit run, screen-reader audit, HDMI hardware test or public-host check was performed. WebKit's binary was not installed. No QR scan against a real deployment URL has been tested. No historical links, images, map or videos can be checked yet because those collections are deliberately empty.

The first-stage shell is complete; historical research, ten real theses, thirty distinct facts, at least eleven heroes and additional postwar figures, three working videos, historical images/maps, five playable games, per-game results, combined score and actual game-progress persistence remain unfinished. Historical verification is **zero**. Runtime/schema checks do not verify history.

A GitHub CLI authentication check did not succeed in the default sandbox. No publication was attempted and no public URL is claimed. The Pages workflow is prepared but has not run on GitHub. The share/QR configuration remains blank until a real deployment is checked. Follow README.md to publish and then configure the actual URL.

## Delivery-folder limitation

The complete source and documentation remain in `/workspace/el-zhady`. Optional downloadable packaging could not be created: the designated `/codex/browser/projectless/0001-build-the-foundation-of-a-kazakh-language-univer/output` path does not exist in this managed environment and its `/codex` parent is read-only. A scoped filesystem-permission retry returned the same read-only error. No downloadable archive or output-folder link is claimed. This limitation does not affect source files, browser checks or the successful build.
