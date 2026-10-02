export interface IssueReport {
  text: string;
  ts: number;
}

export interface Issue {
  id: string;
  category: 'flooding' | 'sewage' | 'water_supply' | 'streetlight' | 'garbage' | 'road' | string;
  location: string;
  urgency: 'low' | 'medium' | 'high' | string;
  dept: string;
  channel: string;
  confidence: number;
  reason: string;
  reports: IssueReport[];
  first_ts: number;
  letter_en: string;
  letter_ta: string;
  official_no: string;
  admin_closed: boolean;
  votes: Record<string, number>;
  verified: boolean;
}

export interface AnalysisRec {
  category: string;
  department: string;
  channel: string;
  urgency: string;
  location: string;
  duration?: string;
  risk?: string;
  missing_information?: string[];
  confidence: number;
  reason: string;
  source?: string;
  clarify?: string;
}

export interface DuplicateMatch {
  id: string;
  location: string;
  reports: number;
  score: number;
}

export interface AnalysisResponse {
  rec: AnalysisRec;
  duplicate: DuplicateMatch | null;
}
