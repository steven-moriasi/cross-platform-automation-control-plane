export interface ProblemDetails {
  readonly code: string;
  readonly detail: string;
  readonly instance: string;
  readonly requestId: string;
  readonly status: number;
  readonly title: string;
  readonly type: string;
}
