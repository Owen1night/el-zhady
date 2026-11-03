# Isolated playtest bootstrap — prepared, not deployed

Pinned application source: PR #6 `465574fcc86f44b9d166c998c28a2e0d00a73b25`.
Setup kit: `f558c664fc6149be2cdd3d62ecd62c5577205d2a`.

This auxiliary branch installs the existing manual isolated Pages template as `.github/workflows/pages.yml` so it can be copied into a new empty test repository. It does not modify main, either draft PR, production Pages, Supabase or Cron.

The workflow is manual-only and its build/deploy jobs refuse `Owen1night/el-zhady`. It requires a separately configured test repository and a fresh isolated Supabase project. No test URL is live yet.

Preparation checks already passed for the kit: repository/backend refusal guards, isolated browser-storage namespaces, TypeScript/content checks and a transformed production build with a nonfunctional fixture backend. These checks did not contact a hosted backend or deploy a website.

Current owner-only blocker: create the empty public `Owen1night/el-zhady-playtest` repository. The available connector cannot create repositories and the configured CLI account request returned Forbidden. After creation and access verification, the assistant can copy this prepared branch into that repository; the owner need not clone or paste source files manually.

Continue with [the isolated setup guide](README.md), one owner action at a time. Never use the production project for the guide's database, authentication or scheduler setup.
