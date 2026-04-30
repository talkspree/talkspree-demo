import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type BugReportType = 'bug' | 'ui' | 'perf' | 'idea';
export type BugReportStatus = 'unsolved' | 'solved';

export interface BugReport {
  id: string;
  user_id: string;
  type: BugReportType;
  severity: number | null;
  details: string;
  status: BugReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmitBugReportInput {
  type: BugReportType;
  /** Required for 'bug' | 'ui' | 'perf'. Ignored / nulled for 'idea'. */
  severity: number | null;
  details: string;
}

// ============================================================================
// API
// ============================================================================

/**
 * Submit a new bug / feedback ticket. The current authenticated user is
 * recorded automatically (RLS enforces ownership).
 */
export async function submitBugReport(
  input: SubmitBugReportInput
): Promise<BugReport> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    throw new Error('You must be signed in to submit a report.');
  }

  const payload = {
    user_id: user.id,
    type: input.type,
    severity: input.type === 'idea' ? null : input.severity,
    details: input.details.trim(),
  };

  const { data, error } = await supabase
    .from('bug_reports')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error submitting bug report:', error);
    throw error;
  }

  return data as BugReport;
}
