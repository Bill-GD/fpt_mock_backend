export interface RawExcelRow {
  'Nội dung câu hỏi': string | number;
  'Đáp án A': string | number;
  'Đáp án B': string | number;
  'Đáp án C': string | number;
  'Đáp án D': string | number;
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