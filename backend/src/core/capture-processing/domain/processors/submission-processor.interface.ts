import type {
  ProcessableSubmission,
  SubmissionProcessorResult,
} from '../types/processable-submission';

export interface SubmissionProcessor {
  readonly key: string;

  canProcess(submission: ProcessableSubmission): boolean;

  process(submission: ProcessableSubmission): Promise<SubmissionProcessorResult>;
}

export const CAPTURE_SUBMISSION_PROCESSORS = Symbol('CAPTURE_SUBMISSION_PROCESSORS');
