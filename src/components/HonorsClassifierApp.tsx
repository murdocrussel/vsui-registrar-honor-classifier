"use client";

import Image from "next/image";
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

function formatExportStamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}${pad(
    date.getMinutes(),
  )}`;
}

function hasReviewNote(record: ParsedStudentRecord): boolean {
  return record.notes.some((note) => /^Needs review:/i.test(note));
}

export default function HonorsClassifierApp() {
  const [state, setState] = useState<LoadState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("No file chosen");

  const summary = useMemo(() => {
    const records = state?.records ?? [];
    return {
      total: records.length,
      eligible: records.filter((row) => row.status === "eligible").length,
      ineligible: records.filter((row) => row.status === "ineligible").length,
      review: records.filter((row) => row.status === "needs-review" || hasReviewNote(row)).length,
      categoryA: records.filter((row) => Boolean(row.categoryA)).length,
      categoryB: records.filter((row) => Boolean(row.categoryB)).length,
    };
  }, [state]);

  const resultsMessage = state ? `Loaded ${state.fileName}.` : "Upload a workbook to start.";

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    setSelectedFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseWorkbook(buffer);
      setState({ fileName: file.name, ...parsed });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to read workbook.";
      setError(message);
      setState(null);
      setSelectedFileName("No file chosen");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    if (!state?.records.length) return;
    const blob = await exportClassifiedWorkbook(state.records);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const baseName = state.fileName.replace(/\.xlsx?$/i, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
    anchor.download = `${baseName}-exported-${formatExportStamp(new Date())}.xlsx`;
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
      <header className="brand-header">
        <div className="brand-lockup">
          <div className="brand-logo">
            <Image
              src="/vsu-logo-2022-normal.png"
              alt="VSU Isabel logo"
              fill
              sizes="148px"
              priority
              className="brand-mark"
            />
          </div>
          <div className="brand-copy">
            <p className="eyebrow">Visayas State University Isabel</p>
            <h1>Registrar Honors Classifier</h1>
            <p className="brand-subtitle">
              A simple tool for checking student honors, flagging ineligible rows, and exporting a filtered workbook.
            </p>
          </div>
        </div>
      </header>

      <section className="hero">
        <div>
          <h2 className="hero-title">Upload a workbook, review the rows, and export the result.</h2>
          <p className="lede">
            Start with the Excel file from the registrar office, then check the student list, mark any fail flags, and export a
            clean workbook with ready-to-use filters.
          </p>

          <div className="quick-guide">
            <p className="quick-guide-title">Quick steps</p>
            <ol>
              <li>Download the template.</li>
              <li>Fill in the student rows.</li>
              <li>Upload the finished file here.</li>
            </ol>
          </div>
        </div>

        <div className="panel upload-panel">
          <div className="upload-heading">
            <h2>Start here</h2>
            <p>Choose one workbook file and the app will read it right away.</p>
          </div>
          <label className="upload upload-control">
            <span>Upload workbook</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
              }}
            />
            <span className="upload-filename">{selectedFileName}</span>
          </label>

          <button type="button" className="button" onClick={() => void handleExport()} disabled={!state?.records.length}>
            Export classified workbook
          </button>

          <a className="button button-secondary" href="/vsui-registrar-honors-classifier-template.xlsx" download>
            Download registrar template
          </a>

          <div className="template-note">
            <strong>Recommended first step:</strong> download the registrar template, fill in the student rows, then upload
            that file here. The <strong>Program</strong> field can be typed manually for any program. For Category B,
            type <strong>CONSISTENT</strong> in <strong>Remarks</strong>.
          </div>

          <p className="fine-print">
            Start with the template if you want a clean format. Everything runs locally in your browser first, so you can
            test it safely before sharing the output.
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
          <span>Review notes</span>
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
            <h2>How it works</h2>
            <p>
              Category A uses the previous two semesters or the 1st-semester freshman rule. Category B uses cumulative GPA.
              If a student is marked with a fail flag, the app marks them ineligible.
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
              <li>Uses cumulative GPA and CONSISTENT in Remarks</li>
            </ul>
          </div>
          <div>
            <h3>Data note</h3>
            <ul>
              <li>The current workbook styles do not always expose failing grades directly.</li>
              <li>You can manually tick the fail box beside any student to mark them ineligible.</li>
              <li>Category B students should have CONSISTENT written in the Remarks column.</li>
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
                <th>Program</th>
                <th>Basis GPA</th>
                <th>Cumulative</th>
                <th>Category A</th>
                <th>Category B</th>
                <th>Fail Flag</th>
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
                      <span>{record.studentNumber ?? "No student no."}</span>
                    </td>
                    <td>
                      <strong>{record.programName}</strong>
                      <span>{record.yearLevel ? `Year ${record.yearLevel}` : "No year level"}</span>
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
                        <span>Mark</span>
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

      <footer className="page-footer">
        <p className="footer-title">Visayas State University Isabel</p>
        <p>© 2026 Registrar Honors Classifier. For registrar use only.</p>
        <p className="footer-contact">Contact the developer for technical support or updates.</p>
      </footer>
    </main>
  );
}
