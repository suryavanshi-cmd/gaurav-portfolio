// Shape of the Reel Analyzer schema, mirroring supabase/migrations.
// Regenerate the source of truth with:
//   supabase gen types typescript --project-id <ref> > src/lib/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type JobStatus = 'queued' | 'fetching' | 'transcribing' | 'analyzing' | 'done' | 'failed';

export const JOB_STATUSES: readonly JobStatus[] = [
  'queued',
  'fetching',
  'transcribing',
  'analyzing',
  'done',
  'failed',
] as const;

export type ProfileRow = {
  id: string;
  email: string | null;
  credits_remaining: number;
  plan: string;
  created_at: string;
};

export type ReelRow = {
  id: string;
  user_id: string;
  source: 'link' | 'upload';
  instagram_url: string | null;
  caption: string | null;
  author_handle: string | null;
  like_count: number | null;
  comment_count: number | null;
  view_count: number | null;
  duration_seconds: number | null;
  video_storage_path: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type JobRow = {
  id: string;
  reel_id: string;
  status: JobStatus;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export type TranscriptRow = {
  id: string;
  reel_id: string;
  full_text: string;
  segments: Json | null;
  language: string | null;
};

export type AnalysisRow = {
  id: string;
  reel_id: string;
  summary: string;
  hook_analysis: string | null;
  structure_breakdown: Json | null;
  tone: string | null;
  target_audience: string | null;
  virality_factors: Json | null;
  actionable_takeaways: Json | null;
  raw_model_output: Json | null;
  model_version: string | null;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Pick<ProfileRow, 'id'> & Partial<ProfileRow>>;
      reels: Table<ReelRow, Pick<ReelRow, 'user_id' | 'source'> & Partial<ReelRow>>;
      jobs: Table<JobRow, Pick<JobRow, 'reel_id'> & Partial<JobRow>>;
      transcripts: Table<TranscriptRow, Pick<TranscriptRow, 'reel_id' | 'full_text'> & Partial<TranscriptRow>>;
      analyses: Table<AnalysisRow, Pick<AnalysisRow, 'reel_id' | 'summary'> & Partial<AnalysisRow>>;
    };
    Views: Record<never, never>;
    Functions: {
      consume_credit: { Args: { p_user_id: string }; Returns: number };
    };
    Enums: { job_status: JobStatus };
    CompositeTypes: Record<never, never>;
  };
};
