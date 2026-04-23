import * as XLSX from "xlsx";
import type { ParsedStudentRecord } from "./honors-types";
import { getReadableOutcome } from "./honors-engine";

export function exportClassifiedWorkbook(records: ParsedStudentRecord[]): Blob {
  const rows = [
    [
      "Sheet",
      "Program",
      "Section",
      "Student No.",
      "Student Name",
      "Year Level",
      "2nd Sem GPA",
      "Summer GPA",
      "1st Sem GPA",
      "Basis GPA",
      "Cumulative GPA",
      "Category A",
      "Category B",
      "Status",
      "Manual Fail Flag",
      "Notes",
    ],
    ...records.map((record) => [
      record.sheetName,
      record.programName,
      record.section,
      record.studentNumber ?? "",
      record.studentName,
      record.yearLevel ?? "",
      record.secondSemGpa ?? "",
      record.summerGpa ?? "",
      record.firstSemGpa ?? "",
      record.basisGpa ?? "",
      record.cumulativeGpa ?? "",
      getReadableOutcome(record.categoryA),
      getReadableOutcome(record.categoryB),
      record.status,
      record.manualFailFlag ? "Yes" : "No",
      record.notes.join(" "),
    ]),
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 16 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 22 },
    { wch: 24 },
    { wch: 14 },
    { wch: 14 },
    { wch: 36 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Classified Students");

  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
