import type { RequestHandler } from "express";
import { NotFoundError } from "../../domain/errors/AppError.js";

export const notFound: RequestHandler = (req) => {
  throw new NotFoundError(`Rota ${req.method} ${req.originalUrl} não encontrada.`);
};