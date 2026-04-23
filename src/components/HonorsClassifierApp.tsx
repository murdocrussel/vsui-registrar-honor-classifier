"use client";

import { useMemo, useState } from "react";
import type { ParsedStudentRecord } from "@/lib/honors-types";
import { reclassifyRecords } from "@/lib/honors-engine";
import { exportClassifiedWorkbook } from "@/lib/workbook-export";
import { parseWorkbook } from "@/lib/workbook-parser";

type LoadState = {
  fileName: string;
  records: ParsedStudentRecord[];
  warnings: string[];
};

function formatGpa(value?: number): string {
  return typeof value === "number" ? value.toFixed(3) : "—";
}

function safeJoin(values: string[]): string {
  return values.length ? values.join(" ") : "Ready for upload.";
}

export default function HonorsClassifierApp() {
  const [state, setState] = useState<LoadState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    const records = state?.records ?? [];
    return {
      total: records.length,
      eligible: records.filter((row) => row.status === "eligible").length,
      ineligible: records.filter((row) => row.status === "ineligible").length,
      review: records.filter((row) => row.status === "needs-review").length,
      categoryA: records.filter((row) => Boolean(row.categoryA)).length,
      categoryB: records.filter((row) => Boolean(row.categoryB)).length,
    };
  }, [state]);

  const resultsMessage = state ? `Loaded ${state.fileName}.` : "Upload a workbook to start.";

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      setState({ fileName: file.name, ...parsed });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to read workbook.";
      setError(message);
      setState(null);
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!state?.records.length) return;
    const blob = exportClassifiedWorkbook(state.records);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `classified-${state.fileName.replace(/\.xlsx?$/i, "")}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function toggleManualFailFlag(index: number, checked: boolean) {
    setState((current) => {
      if (!current) return current;
      const nextRecords = current.records.map((record, recordIndex) =>
        recordIndex === index ? { ...record, manualFailFlag: checked } : record,
      );
      return {
        ...current,
        records: reclassifyRecords(nextRecords),
      };
    });
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Registrar honors classifier</p>
          <h1>Classify students from Excel, then export the result for Vercel.</h1>
          <p className="lede">
            Upload the registrar workbook, parse the sheet variants, apply the honor rules, and download a clean results file.
            This starter is designed around your current 2026 workbook formats.
          </p>
        </div>

        <div className="panel upload-panel">
          <label className="upload">
            <span>Upload workbook</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
          </label>

          <button type="button" className="button" onClick={handleExport} disabled={!state?.records.length}>
            Export classified workbook
          </button>

          <p className="fine-print">
            Parsed locally in the browser. No file upload is required to a server for the first version.
          </p>
        </div>
      </section>

      <section className="stats">
        <article className="stat">
          <span>Total rows</span>
          <strong>{summary.total}</strong>
        </article>
        <article className="stat">
          <span>Eligible</span>
          <strong>{summary.eligible}</strong>
        </article>
        <article className="stat">
          <span>Needs review</span>
          <strong>{summary.review}</strong>
        </article>
        <article className="stat">
          <span>Category A / B</span>
          <strong>
            {summary.categoryA} / {summary.categoryB}
          </strong>
        </article>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>How the classification works</h2>
            <p>
              Category A uses the previous two semesters or the 1st-semester freshman rule. Category B uses cumulative GPA.
              Any explicit failing-grade flag marks the student ineligible.
            </p>
          </div>
        </div>

        <div className="rule-grid">
          <div>
            <h3>Category A</h3>
            <ul>
              <li>1.000 to 1.450 = Dean&apos;s Honors</li>
              <li>1.451 to 1.750 = College Honors</li>
              <li>Freshmen use 1st semester GPA</li>
            </ul>
          </div>
          <div>
            <h3>Category B</h3>
            <ul>
              <li>1.000 to 1.450 = President&apos;s Honors</li>
              <li>1.451 to 1.750 = University Honors</li>
              <li>Uses cumulative GPA</li>
            </ul>
          </div>
          <div>
            <h3>Data note</h3>
            <ul>
              <li>The current workbook styles do not always expose failing grades directly.</li>
              <li>This app accepts a fail flag when the workbook has one, otherwise it flags the row for review.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <h2>Results</h2>
            <p>{resultsMessage}</p>
          </div>
          {loading ? <span className="badge">Processing...</span> : null}
        </div>

        {error ? <p className="error">{error}</p> : null}
        {state?.warnings.map((warning) => (
          <p className="warning" key={warning}>
            {warning}
          </p>
        ))}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Section</th>
                <th>Basis GPA</th>
                <th>Cumulative</th>
                <th>Category A</th>
                <th>Category B</th>
                <th>Manual Fail Flag</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {state?.records.length ? (
                state.records.map((record, index) => (
                  <tr key={`${record.sheetName}-${record.studentName}-${record.section}`}>
                    <td>
                      <strong>{record.studentName}</strong>
                      <span>{record.programName}</span>
                    </td>
                    <td>
                      <strong>{record.section}</strong>
                      <span>{record.studentNumber ?? "No student no."}</span>
                    </td>
                    <td>{formatGpa(record.basisGpa)}</td>
                    <td>{formatGpa(record.cumulativeGpa)}</td>
                    <td>{record.categoryA ? record.categoryA.title : "Not qualified"}</td>
                    <td>{record.categoryB ? record.categoryB.title : "Not qualified"}</td>
                    <td>
                      <label className="flag-toggle">
                        <input
                          type="checkbox"
                          checked={record.manualFailFlag}
                          onChange={(event) => toggleManualFailFlag(index, event.target.checked)}
                        />
                        <span>Flag fail</span>
                      </label>
                    </td>
                    <td>
                      <span className={`status ${record.status}`}>{record.status}</span>
                    </td>
                    <td>{record.notes.length ? record.notes.join(" ") : "OK"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="empty">
                    Upload one of the registrar workbooks to preview the classification results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
