# VSU Isabel Registrar Honors Classifier

This app helps registrar staff classify students for honors and awards using Excel files.

## What you can do

- Upload the registrar workbook
- Review the parsed student list
- Tick a fail flag for any student who should be ineligible
- Export a clean `.xlsx` file with the results

## For first-time users

1. Open the project folder in VS Code.
2. Open the terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the local link shown in the terminal.
6. Upload one of the registrar Excel files.
7. Review the table.
8. Tick the fail box if needed.
9. Click export to download the finished Excel file.

## When something looks wrong

- If the table is empty, try another workbook file.
- If the file does not upload, make sure it is `.xlsx` or `.xls`.
- If the export button does nothing, wait until the workbook finishes loading.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the simple branch and deployment flow.
