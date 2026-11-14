// Shared data types for the harmonized NASA PSI combustion dataset.
// Code generated with SI assistance (Claude Code).

export type Granularity = "test" | "session" | "matrix";

export interface TestRecord {
  id: string;
  accession: string;
  acronym: string;
  test_id: string | null;
  date: string | null;
  granularity: Granularity;
  fuel: string | null;
  fuel_phase: string | null;
  material: string | null;
  geometry: string | null;
  o2_pct: number | null;
  o2_min: number | null;
  o2_max: number | null;
  o2_where: string;
  pressure_atm: number | null;
  flow_cm_s: number | null;
  diluent: string | null;
  ignited: boolean | null;
  outcome: string | null;
  burn_time_s: number | null;
  n_flames: number | null;
  assumed: string[];
  notes: string | null;
  source_file: string;
  raw: Record<string, string>;
}

export interface Publication {
  title: string;
  authors: string;
  doi: string;
}

export interface Investigation {
  accession: string;
  acronym: string;
  title: string;
  is_combustion: boolean;
  excluded_reason: string | null;
  research_area: string;
  sub_area: string;
  project_type: string;
  platform: string;
  hardware: string;
  center: string;
  start: string;
  end: string;
  doi: string;
  objective: string;
  approach: string;
  hypothesis: string;
  impacts: string;
  related: string;
  people: string[];
  publications: Publication[];
  pillars: string[];
  fuel_phase: string | null;
  facility: string | null;
  focus: string | null;
  url: string;
  n_records: number;
  n_tests: number;
  n_flames: number | null;
  o2_range: [number, number] | null;
  pressure_range: [number, number] | null;
  flow_range: [number, number] | null;
  fuels: string[];
  materials: string[];
  files: number;
  bytes: number;
  videos: number;
  file_categories: Record<string, number>;
}

export interface FileEntry {
  n: string; // file name
  k: string; // kind: "video" or top-level folder
  c: string; // category shown in PSI
  b: number; // bytes
  v: number; // version
}

export interface Target {
  o2_pct: number;
  pressure_atm: number;
  flow_cm_s?: number | null;
  phase?: string | null;
  material?: string | null;
}

export const PSI_PER_ATM = 14.696;
