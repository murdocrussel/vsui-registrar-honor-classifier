# Vercel Deployment Checklist

This app is already set up to be Vercel-friendly. Use this checklist before you deploy.

## Before deploy

- Confirm `npm run build` passes locally.
- Make sure the app opens with `npm run dev`.
- Verify the workbook parser still works with your current registrar templates.
- Test the manual fail flag on at least one sample row.
- Check that exported `.xlsx` files open correctly in Excel.

## GitHub

- Commit the current changes.
- Push the branch to GitHub.
- Confirm the repo contains:
  - `package.json`
  - `package-lock.json`
  - `src/`
  - `README.md`
  - `DEPLOYMENT.md`

## Branch flow

- Keep `main` as the production branch for Vercel.
- Create feature branches from `main` using a short `codex/<name>` format.
- Open a pull request from the feature branch back into `main`.
- Let Vercel build preview deployments from the feature branch before merging.
- Merge to `main` only after the preview looks correct.

## Vercel settings

- Framework preset: `Next.js`
- Build command: `npm run build`
- Install command: `npm install`
- Output directory: leave default
- Node.js runtime: use the default Vercel version unless you need a specific one

## Environment variables

- None are required for the current version.

## Post-deploy checks

- Open the live app.
- Upload one registrar workbook.
- Confirm rows appear in the preview table.
- Toggle a manual fail flag.
- Export the workbook and check that the output file contains the flag and status columns.

## If something breaks

- If the app fails to build on Vercel, check for unsupported Excel files or invalid workbook layouts first.
- If the preview is empty, try another registrar template to confirm the parser assumptions.
- If exports fail, verify the browser still supports file download in the target environment.
