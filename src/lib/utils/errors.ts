import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function handleApiError(err: unknown): NextResponse {
  console.error(err);

  if (isAppError(err)) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const firstIssue = err.issues[0];
    const message = firstIssue ? `${firstIssue.path.join(".") || "campo"}: ${firstIssue.message}` : "Dados inválidos";
    return NextResponse.json(
      { error: message, code: "VALIDATION_ERROR", details: err.issues },
      { status: 400 }
    );
  }

  if (err instanceof Error) {
    if (err.message.includes("duplicate key value violates unique constraint")) {
      return NextResponse.json(
        { error: "Já existe um registro com esses dados (código ou identificador duplicado)." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFoundResponse(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
