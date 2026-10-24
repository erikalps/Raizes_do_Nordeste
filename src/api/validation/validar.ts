import type { ZodType } from "zod";
import { ValidationError } from "../../domain/errors/AppError.js";

export function validar<T>(schema: ZodType<T>, dados: unknown): T {
  const resultado = schema.safeParse(dados);
  if (!resultado.success) {
    throw new ValidationError(
      resultado.error.issues.map((problema) => ({
        field: problema.path.map(String).join(".") || "body",
        issue: problema.message,
      })),
    );
  }
  return resultado.data;
}