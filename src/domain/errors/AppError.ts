export type ErrorDetail = { field: string; issue: string };

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: ErrorDetail[];

  constructor(statusCode: number, code: string, message: string, details: ErrorDetail[] = []) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, "NAO_ENCONTRADO", message);
  }
}

export class ConflictError extends AppError {
  constructor(code: string, message: string, details: ErrorDetail[] = []) {
    super(409, code, message, details);
  }
}

export class ValidationError extends AppError {
  constructor(details: ErrorDetail[]) {
    super(422, "DADOS_INVALIDOS", "Um ou mais campos são inválidos.", details);
  }
}