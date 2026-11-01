# el-zhady

«Ел жады: Қазақстан, 1939–1953» — a Kazakh-language university history website foundation. The original repository heading above is retained. React + TypeScript + Vite, fully static, no visitor accounts/backend/paid services.

**Stage one only.** Historical collections are empty. Ten thesis themes, thirty facts, at least eleven heroes plus postwar figures, three videos, five games and their scores still need sourced implementation. Draft screens do not count as finished historical content. The site has not been confirmed published.

## Prerequisites and local development

Use Node.js 22 and npm. From this checkout:

```bash
cd /workspace/el-zhady
npm ci
npm run dev -- --port 5173
```

Open `http://localhost:5173`. On your own laptop after cloning, replace the `cd` path with your checkout path. For a real phone on the same Wi-Fi, open your laptop's LAN IP at port 5173. That is a temporary local preview, not a public website. Hosting/forwarding rules may prevent phone access to a remote development environment.

## Checks and production preview

```bash
npm run check
npm test
npm run build
npm run preview -- --port 4173
```

Open `http://localhost:4173`. To preview the completed build from the existing checkout, the exact command is:

```bash
cd /workspace/el-zhady && npm run preview -- --port 4173
```

Run `npm ci` and `npm run build` first on a fresh clone. There is no lint script; `check` performs TypeScript and editorial structure checks. Tests cover public-URL gating and rejection of unsourced verification. See VERIFICATION.md for browser checks actually performed and remaining limits.

## GitHub Pages deployment

The existing Git remote targets `Owen1night/el-zhady`. Its default-branch/publication configuration must be checked by the repository owner. No credentials are included in this project. The supplied workflow deploys on pushes to `main` or manual dispatch. This workspace currently uses branch `work`.

1. Use a **public** GitHub repository. Keep the existing origin if it is the intended repository; otherwise change it only to your actual repository URL. Do not paste credentials into files. Inspect `git status` and review changes before committing.
2. Commit the source, lockfile, docs and `.github/workflows/pages.yml`; do not commit `node_modules`, `dist`, `.env` or `work`. Push your working branch and merge it into `main`. If the deployment branch has another name, change `on.push.branches` to that actual branch before merging. Example for the current working branch:

   ```bash
   git add .
   git commit -m "Build Kazakh history website foundation"
   git push -u origin work
   ```

   Open a pull request from `work` into the repository's intended `main` branch and merge after review. Do not force-push or overwrite existing work. On a local clone you may instead be on `main`; inspect `git branch --show-current` first.
3. In GitHub: **Settings → Pages → Build and deployment → Source → GitHub Actions**. Ensure Actions is enabled. On `main`, run **Actions → Deploy GitHub Pages → Run workflow** if a push has not triggered it.
4. The workflow installs using `npm ci`, checks, tests, builds `dist/`, uploads it, and deploys through GitHub Pages. It requires the workflow's declared `pages: write` and `id-token: write` permissions. If organization policy blocks Pages, resolve that in the repository settings. Do not substitute a paid service.
5. Wait for both jobs to succeed. Copy the **actual URL returned by the deployment**, rather than assuming the repository exists publicly or inventing a URL.
6. Open that URL without signing in. Navigate to all sections; refresh a `#/timeline` URL; check fonts/assets under the repository prefix and test on phones. Only after this succeeds may you call the site published.
7. Configure sharing after checking that real public URL: **Settings → Secrets and variables → Actions → Variables → New repository variable**, name `VITE_PUBLIC_SITE_URL`, value the full checked HTTPS site URL including repository path and trailing slash. Re-run the workflow on `main`. This is a public build variable, not a secret. Check the QR code on a phone and copied link after the second deployment.

For local production-share testing, copy `.env.example` to `.env.local`, set the same real checked URL, and rebuild. Do not use localhost or a guessed public URL. Blank or invalid values show an honest unconfigured-share message. The app never derives its public share link from `window.location`.

GitHub Pages serves the `dist` artifact only. Vite's relative `base: './'` and hash navigation support `/repository-name/` without server rewrites or SPA 404 hacks. New assets must be imported or use `import.meta.env.BASE_URL`; see CONTENT_GUIDE.md. The QR package runs in the browser; there is no tracking or hosted QR service.

## Files and ongoing work

- PROJECT_SPEC.md — architecture, sections, scoring/storage plan and design decisions.
- REQUIREMENTS.md — evidence-based assessment checklist.
- CONTENT_GUIDE.md — editorial schemas, source standards and implementation rules.
- VERIFICATION.md — actual checks and limits.
- `src/data/` — all typed historical collections and editorial plans.
- `src/components/`, `src/App.tsx`, `src/styles.css` — responsive shell.
- `src/lib/` — storage, URL and editorial validators.

The header's monitor button toggles larger presentation text. Use the laptop's normal display settings for HDMI. Preferences and visited sections persist only on the current browser/device; they are not a grade. Results → Тазарту resets this app's preferences; no other website's storage is cleared.
