import * as XLSX from "xlsx";
import type { ParsedStudentRecord, WorkbookParseResult } from "./honors-types";
import { classifyRecords } from "./honors-engine";

type RowValue = string | number | boolean | null | undefined;

const EMPTY_MARKERS = new Set(["", "-", "n/a", "na", "none"]);

function normalizeText(value: RowValue): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: RowValue): string {
  return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
}

function parseNumber(value: RowValue): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = normalizeText(value);
  if (!text || EMPTY_MARKERS.has(text.toLowerCase())) return undefined;
  const parsed = Number.parseFloat(text.replace(/[^0-9.]+/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isLikelyFailMarker(value: RowValue): boolean {
  const text = normalizeKey(value);
  return /(fail|failing|inc|removed|disqualif)/i.test(text);
}

function countNonEmpty(values: RowValue[]): number {
  return values.filter((value) => normalizeText(value) !== "").length;
}

function inferYearLevel(section: string): number | null {
  const match = section.match(/\b(I|II|III|IV)\b/i);
  if (!match) return null;
  const roman = match[1].toUpperCase();
  return { I: 1, II: 2, III: 3, IV: 4 }[roman as "I" | "II" | "III" | "IV"] ?? null;
}

function inferProgramName(sheetName: string, titleRow?: RowValue[]): string {
  const title = titleRow?.find((value) => typeof value === "string" && value.trim())?.toString().trim();
  return title || sheetName;
}

function buildHeaderMap(row: RowValue[]): Map<string, number> {
  const map = new Map<string, number>();
  row.forEach((value, index) => {
    const key = normalizeKey(value);
    if (key) map.set(key, index);
  });
  return map;
}

function findHeaderIndex(map: Map<string, number>, patterns: RegExp[]): number | undefined {
  for (const [key, index] of map.entries()) {
    if (patterns.some((pattern) => pattern.test(key))) return index;
  }
  return undefined;
}

function detectSection(row: RowValue[]): string | undefined {
  const values = row.map(normalizeText).filter(Boolean);
  if (values.length === 0) return undefined;
  if (values.length > 2) return undefined;
  if (values.some((value) => /name of students|course|gpa|remarks|id number/i.test(value))) return undefined;
  if (values.some((value) => /prepared by|checked by|registrar|admin aide/i.test(value))) return undefined;
  return values.join(" ").trim();
}

function rowLooksLikeHeader(row: RowValue[]): boolean {
  const text = row.map(normalizeKey).join(" | ");
  return /name of students/.test(text) && /course/.test(text);
}

function rowHasAnyStudentData(row: RowValue[]): boolean {
  return row.some((value) => typeof value === "string" && value.trim().length > 0);
}

function detectNormalizedHeader(row: RowValue[]): boolean {
  const text = row.map(normalizeKey).join(" | ");
  return /student.*name/.test(text) && /program/.test(text) && /year.*level/.test(text) && /(section|course)/.test(text);
}

function headerIndexByPatterns(row: RowValue[], patterns: RegExp[]): number | undefined {
  const map = buildHeaderMap(row);
  return findHeaderIndex(map, patterns);
}

function parseFailFlag(value: RowValue): boolean {
  const text = normalizeKey(value);
  return /^(yes|y|true|1|x|failed|fail)$/i.test(text) || isLikelyFailMarker(value);
}

function parseNormalizedSheet(sheetName: string, rows: RowValue[][]): ParsedStudentRecord[] {
  if (!rows.length || !detectNormalizedHeader(rows[0] ?? [])) return [];

  const headerRow = rows[0] ?? [];
  const studentNoIdx = headerIndexByPatterns(headerRow, [/student.*no/i, /student.*number/i, /^id$/i]);
  const nameIdx = headerIndexByPatterns(headerRow, [/student.*name/i, /^name$/i]);
  const programIdx = headerIndexByPatterns(headerRow, [/program/i, /course/i]);
  const yearLevelIdx = headerIndexByPatterns(headerRow, [/year.*level/i, /year/i]);
  const sectionIdx = headerIndexByPatterns(headerRow, [/section/i, /course/i]);
  const secondSemIdx = headerIndexByPatterns(headerRow, [/second.*sem/i, /2nd.*sem/i]);
  const summerIdx = headerIndexByPatterns(headerRow, [/summer/i]);
  const firstSemIdx = headerIndexByPatterns(headerRow, [/first.*sem/i, /1st.*sem/i]);
  const cumulativeIdx = headerIndexByPatterns(headerRow, [/cumulative/i]);
  const remarksIdx = headerIndexByPatterns(headerRow, [/remarks?/i]);
  const failIdx = headerIndexByPatterns(headerRow, [/fail/i, /failing/i, /disqual/i]);

  const records: ParsedStudentRecord[] = [];

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i] ?? [];
    if (!rowHasAnyStudentData(row)) continue;

    const studentName = normalizeText(nameIdx !== undefined ? row[nameIdx] : row[1]);
    if (!studentName || /instructions?|sample|template/i.test(studentName)) continue;

    const programName = normalizeText(programIdx !== undefined ? row[programIdx] : row[2]);
    const section = normalizeText(sectionIdx !== undefined ? row[sectionIdx] : "");
    const yearLevelRaw = yearLevelIdx !== undefined ? row[yearLevelIdx] : undefined;
    const yearLevel = typeof yearLevelRaw === "number" ? yearLevelRaw : inferYearLevel(normalizeText(yearLevelRaw) || section);

    records.push({
      sheetName,
      programName: programName || sheetName,
      section: section || programName || sheetName,
      studentNumber: studentNoIdx !== undefined ? normalizeText(row[studentNoIdx]) || undefined : undefined,
      studentName,
      yearLevel,
      secondSemGpa: parseNumber(secondSemIdx !== undefined ? row[secondSemIdx] : undefined),
      summerGpa: parseNumber(summerIdx !== undefined ? row[summerIdx] : undefined),
      firstSemGpa: parseNumber(firstSemIdx !== undefined ? row[firstSemIdx] : undefined),
      cumulativeGpa: parseNumber(cumulativeIdx !== undefined ? row[cumulativeIdx] : undefined),
      basisGpa: undefined,
      basisSource: "missing",
      hasFailingGrade: failIdx !== undefined ? parseFailFlag(row[failIdx]) : parseFailFlag(remarksIdx !== undefined ? row[remarksIdx] : undefined),
      manualFailFlag: false,
      status: "needs-review",
      notes: [],
    });
  }

  return records;
}

export function parseWorkbook(buffer: ArrayBuffer): WorkbookParseResult {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: true });
  const records: ParsedStudentRecord[] = [];
  const warnings: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RowValue[]>(sheet, { header: 1, blankrows: false, defval: null }) as RowValue[][];

    const normalizedRecords = parseNormalizedSheet(sheetName, rows);
    if (normalizedRecords.length) {
      records.push(...normalizedRecords);
      continue;
    }

    let currentSection = sheetName;
    let currentProgram = sheetName;

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index] ?? [];
      const section = detectSection(row);
      if (section) {
        currentSection = section;
        const titleRow = rows[index - 1];
        if (titleRow) currentProgram = inferProgramName(sheetName, titleRow);
      }

      if (!rowLooksLikeHeader(row)) continue;

      const headerMap = buildHeaderMap(row);
      const nameIdx = findHeaderIndex(headerMap, [/name of students?/i]);
      const sectionIdx = findHeaderIndex(headerMap, [/course.*section/i, /course & year/i, /course/i]);
      const studentNoIdx = findHeaderIndex(headerMap, [/^id number$/i]);
      const secondSemIdx = findHeaderIndex(headerMap, [/2nd sem/i, /2nd semester/i]);
      const summerIdx = findHeaderIndex(headerMap, [/summer/i]);
      const firstSemIdx = findHeaderIndex(headerMap, [/1st sem/i, /1st semester/i]);
      const cumulativeIdx = findHeaderIndex(headerMap, [/cumulative/i, /commulative/i]);
      const remarksIdx = findHeaderIndex(headerMap, [/remarks?/i]);

      let sawDataRow = false;
      let blankRun = 0;

      for (let dataIndex = index + 1; dataIndex < rows.length; dataIndex += 1) {
        const dataRow = rows[dataIndex] ?? [];
        if (!rowHasAnyStudentData(dataRow)) {
          if (sawDataRow) {
            blankRun += 1;
            if (blankRun >= 2) break;
          }
          continue;
        }

        blankRun = 0;
        sawDataRow = true;
        if (rowLooksLikeHeader(dataRow)) break;

        const possibleSection = detectSection(dataRow);
        if (possibleSection) break;

        const studentName = normalizeText(nameIdx !== undefined ? dataRow[nameIdx] : dataRow[1] ?? dataRow[2]);
        if (!studentName || /prepared by|checked by|list of students/i.test(studentName)) continue;

        const sectionText = normalizeText(sectionIdx !== undefined ? dataRow[sectionIdx] : currentSection);
        const record: ParsedStudentRecord = {
          sheetName,
          programName: currentProgram,
          section: sectionText || currentSection,
          studentNumber: studentNoIdx !== undefined ? normalizeText(dataRow[studentNoIdx]) || undefined : undefined,
          studentName,
          yearLevel: inferYearLevel(sectionText || currentSection),
          secondSemGpa: parseNumber(secondSemIdx !== undefined ? dataRow[secondSemIdx] : undefined),
          summerGpa: parseNumber(summerIdx !== undefined ? dataRow[summerIdx] : undefined),
          firstSemGpa: parseNumber(firstSemIdx !== undefined ? dataRow[firstSemIdx] : undefined),
          cumulativeGpa: parseNumber(cumulativeIdx !== undefined ? dataRow[cumulativeIdx] : undefined),
          basisGpa: undefined,
          basisSource: "missing",
          hasFailingGrade: remarksIdx !== undefined ? isLikelyFailMarker(dataRow[remarksIdx]) : false,
          manualFailFlag: false,
          status: "needs-review",
          notes: [],
        };

        const hasGpa = [record.secondSemGpa, record.summerGpa, record.firstSemGpa, record.cumulativeGpa].some((value) => typeof value === "number");
        if (!hasGpa) continue;

        records.push(record);
      }
    }
  }

  const classified = classifyRecords(records);

  if (classified.length === 0) {
    warnings.push("No student rows were detected. Check whether the uploaded workbook follows one of the registrar templates.");
  }

  return { records: classified, warnings };
}
