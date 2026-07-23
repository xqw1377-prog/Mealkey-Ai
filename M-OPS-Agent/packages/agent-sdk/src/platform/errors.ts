export class MkError extends Error {
  readonly code: string;
  readonly httpStatus?: number;
  readonly details?: unknown;

  constructor(
    code: string,
    message: string,
    opts?: { httpStatus?: number; details?: unknown },
  ) {
    super(message);
    this.name = "MkError";
    this.code = code;
    this.httpStatus = opts?.httpStatus;
    this.details = opts?.details;
  }
}

export class MkScopeError extends MkError {
  constructor(scope: string) {
    super("SCOPE_DENIED", `Context scope not granted: ${scope}`, {
      httpStatus: 403,
    });
    this.name = "MkScopeError";
  }
}

export class MkAuthError extends MkError {
  constructor(message = "Agent install or token invalid") {
    super("AUTH_EXPIRED", message, { httpStatus: 401 });
    this.name = "MkAuthError";
  }
}
