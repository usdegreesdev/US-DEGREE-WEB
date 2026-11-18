export interface SearchResult {
  program_id: number;
  program_title: string;
  cip_code: string;
  credential_title: string;
  credential_level: number | null;
  college_type?: string | null;
  school_type: string | null;
  school_name: string;
  city: string | null;
  state: string | null;
  unitid: number | string;
  admission_rate: number | string | null;
  earnings_year_5: number | string | null;
  roi_20yr: number | string | null;
  tuition_in_state?: number | string | null;
  sticker_price_by_api?: number | string | null;
  school_min_range?: number | null;
  school_max_range?: number | null;
  school_url?: string | null;
  sticker_price?: number | string | null;
}

export interface SearchQueryParams {
  credential_title?: string;
  state?: string;
  title?: string;
}

export type ViewMode = "list" | "grid";
