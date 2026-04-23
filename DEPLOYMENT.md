# Deployment Guide

Use this guide when you are ready to publish the app.

## Before you start

- Make sure the app runs with `npm run dev`.
- Make sure the build passes with `npm run build`.
- Keep your Excel files ready for testing.

## Simple branch flow

1. Work on a feature branch instead of the main branch.
2. Give the branch a short name like `codex/update-copy`.
3. Push the branch to your GitHub repository.
4. Open a pull request into `main`.
5. Review the preview build.
6. Merge only when everything looks correct.

## Hosting settings

- Use the default settings for a Next.js project.
- Use `npm install` for install.
- Use `npm run build` for build.
- Leave the output folder as default.

## Before you share it

- Upload one sample workbook.
- Check that the student rows appear.
- Tick and untick a fail flag.
- Export the file and open it in Excel.

## If you are stuck

- If the preview is blank, try another workbook.
- If the build fails, run `npm run build` locally first.
- If the export looks wrong, reload the app and try again with a small file.
