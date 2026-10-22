import type { ErrorRequestHandler } from "express";
import { AppError } from "../../domain/errors/AppError.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const base = { timestamp: new Date().toISOString(), path: req.originalUrl };

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      details: err.details,
      ...base,
    });
    return;
  }

  // JSON malformado no corpo da requisição
  if (err instanceof SyntaxError && "body" in err) {
    res.status(400).json({
      error: "JSON_INVALIDO",
      message: "O corpo da requisição não é um JSON válido.",
      details: [],
      ...base,
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: "ERRO_INTERNO",
    message: "Erro inesperado no servidor.",
    details: [],
    ...base,
  });
};