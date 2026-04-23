export type HonorTrack = "category-a" | "category-b";

export type HonorBand = "dean" | "college" | "president" | "university";

export type ClassificationStatus = "eligible" | "ineligible" | "needs-review";

export interface HonorOutcome {
  track: HonorTrack;
  band: HonorBand;
  title: string;
  minGpa: number;
  maxGpa: number;
}

export interface ParsedStudentRecord {
  sheetName: string;
  programName: string;
  section: string;
  studentNumber?: string;
  studentName: string;
  yearLevel: number | null;
  secondSemGpa?: number;
  summerGpa?: number;
  firstSemGpa?: number;
  cumulativeGpa?: number;
  basisGpa?: number;
  basisSource: "first-sem" | "two-sem" | "two-sem-with-summer" | "missing";
  hasFailingGrade: boolean;
  isConsistentHonors: boolean;
  manualFailFlag: boolean;
  categoryA?: HonorOutcome;
  categoryB?: HonorOutcome;
  status: ClassificationStatus;
  notes: string[];
}

export interface WorkbookParseResult {
  records: ParsedStudentRecord[];
  warnings: string[];
}
