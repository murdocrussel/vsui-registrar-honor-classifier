import type { HonorBand, HonorOutcome, ParsedStudentRecord } from "./honors-types";

const HONOR_THRESHOLDS: Array<HonorOutcome> = [
  { track: "category-a", band: "dean", title: "DEAN'S HONORS", minGpa: 1.0, maxGpa: 1.45 },
  { track: "category-a", band: "college", title: "COLLEGE HONORS", minGpa: 1.451, maxGpa: 1.75 },
  { track: "category-b", band: "president", title: "PRESIDENT'S HONORS", minGpa: 1.0, maxGpa: 1.45 },
  { track: "category-b", band: "university", title: "UNIVERSITY HONORS", minGpa: 1.451, maxGpa: 1.75 },
];

function classifyGpa(gpa: number | undefined, track: "category-a" | "category-b"): HonorOutcome | undefined {
  if (typeof gpa !== "number" || Number.isNaN(gpa)) return undefined;

  return HONOR_THRESHOLDS.find((row) => row.track === track && gpa >= row.minGpa && gpa <= row.maxGpa);
}

function inferBasisGpa(record: ParsedStudentRecord): { basisGpa?: number; basisSource: ParsedStudentRecord["basisSource"] } {
  const yearOne = record.yearLevel === 1;

  if (yearOne && typeof record.firstSemGpa === "number") {
    return { basisGpa: record.firstSemGpa, basisSource: "first-sem" };
  }

  const values: number[] = [];
  if (typeof record.secondSemGpa === "number") values.push(record.secondSemGpa);
  if (typeof record.summerGpa === "number") values.push(record.summerGpa);
  if (typeof record.firstSemGpa === "number") values.push(record.firstSemGpa);

  if (values.length === 0) return { basisSource: "missing" };
  if (values.length === 1) return { basisGpa: values[0], basisSource: "first-sem" };
  if (values.length === 2) return { basisGpa: (values[0] + values[1]) / 2, basisSource: "two-sem" };
  return { basisGpa: values.reduce((sum, value) => sum + value, 0) / values.length, basisSource: "two-sem-with-summer" };
}

export function classifyRecord(record: ParsedStudentRecord): ParsedStudentRecord {
  const inferred = inferBasisGpa(record);
  const categoryA = classifyGpa(inferred.basisGpa, "category-a");
  const categoryB = record.isConsistentHonors ? classifyGpa(record.cumulativeGpa, "category-b") : undefined;
  const notes: string[] = [];
  const hasFailingGrade = record.hasFailingGrade || record.manualFailFlag;

  if (record.hasFailingGrade) {
    notes.push("Disqualified: failing grade flagged from workbook.");
  }

  if (record.manualFailFlag) {
    notes.push("Disqualified: manually flagged as failing grade.");
  }

  if (!inferred.basisGpa) {
    notes.push("Needs review: missing basis GPA.");
  }

  if (typeof record.cumulativeGpa !== "number") {
    notes.push("Needs review: missing cumulative GPA.");
  }

  if (!record.isConsistentHonors) {
    notes.push("Needs review: Category B requires CONSISTENT in Remarks.");
  }

  if (record.yearLevel === 1) {
    notes.push("Freshman basis uses 1st semester GPA.");
  }

  return {
    ...record,
    basisGpa: inferred.basisGpa,
    basisSource: inferred.basisSource,
    categoryA,
    categoryB,
    status: hasFailingGrade ? "ineligible" : categoryA || categoryB ? "eligible" : "needs-review",
    notes,
  };
}

export function classifyRecords(records: ParsedStudentRecord[]): ParsedStudentRecord[] {
  return records.map((record) => classifyRecord(record));
}

export function reclassifyRecords(records: ParsedStudentRecord[]): ParsedStudentRecord[] {
  return classifyRecords(records);
}

export function getReadableOutcome(outcome?: HonorOutcome): string {
  return outcome ? outcome.title : "Not qualified";
}
