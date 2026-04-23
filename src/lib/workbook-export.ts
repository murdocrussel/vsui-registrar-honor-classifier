import ExcelJS from "exceljs";
import type { ParsedStudentRecord } from "./honors-types";
import { getReadableOutcome } from "./honors-engine";

export async function exportClassifiedWorkbook(records: ParsedStudentRecord[]): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VSU Isabel Registrar Honors Classifier";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Classified Students", {
    views: [{ state: "frozen", xSplit: 4, ySplit: 1, topLeftCell: "E2", activeCell: "E2" }],
  });

  worksheet.columns = [
    { header: "Student No.", key: "studentNumber", width: 12 },
    { header: "Student Name", key: "studentName", width: 28 },
    { header: "Program", key: "programName", width: 28 },
    { header: "Year Level", key: "yearLevel", width: 10 },
    { header: "Sheet", key: "sheetName", width: 18 },
    { header: "2nd Sem GPA", key: "secondSemGpa", width: 12 },
    { header: "Summer GPA", key: "summerGpa", width: 12 },
    { header: "1st Sem GPA", key: "firstSemGpa", width: 12 },
    { header: "Basis GPA", key: "basisGpa", width: 12 },
    { header: "Cumulative GPA", key: "cumulativeGpa", width: 14 },
    { header: "Category A", key: "categoryA", width: 22 },
    { header: "Category B", key: "categoryB", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Manual Fail Flag", key: "manualFailFlag", width: 14 },
    { header: "Notes", key: "notes", width: 36 },
  ];

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F4D2B" } };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFD6DED8" } },
      left: { style: "thin", color: { argb: "FFD6DED8" } },
      bottom: { style: "thin", color: { argb: "FFD6DED8" } },
      right: { style: "thin", color: { argb: "FFD6DED8" } },
    };
  });

  records.forEach((record) => {
    worksheet.addRow({
      studentNumber: record.studentNumber ?? "",
      studentName: record.studentName,
      programName: record.programName,
      yearLevel: record.yearLevel ?? "",
      sheetName: record.sheetName,
      secondSemGpa: record.secondSemGpa ?? "",
      summerGpa: record.summerGpa ?? "",
      firstSemGpa: record.firstSemGpa ?? "",
      basisGpa: record.basisGpa ?? "",
      cumulativeGpa: record.cumulativeGpa ?? "",
      categoryA: getReadableOutcome(record.categoryA),
      categoryB: getReadableOutcome(record.categoryB),
      status: record.status,
      manualFailFlag: record.manualFailFlag ? "Yes" : "No",
      notes: record.notes.join(" "),
    });
  });

  worksheet.autoFilter = "A1:O1";

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
