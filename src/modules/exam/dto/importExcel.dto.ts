export interface RawExcelRow {
  content: string;
  A: string;
  B: string;
  C: string;
  D: string;
  answer: string;
}

export interface ParsedOption {
  label: 'A' | 'B' | 'C' | 'D';
  content: string;
  isCorrect: boolean;
}

export interface ParsedQuestion {
  content: string;
  options: ParsedOption[];
}