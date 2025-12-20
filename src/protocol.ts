export type Request = {
  id: string;
  tool: string;
  input: Record<string, unknown>;
};

export type ErrorResponse = {
  id: string;
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export type SuccessResponse = {
  id: string;
  ok: true;
  output: Record<string, unknown>;
};

export type Response = ErrorResponse | SuccessResponse;
