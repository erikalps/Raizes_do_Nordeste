import type { RequestHandler } from "express";
import { verificarToken } from "../../infrastructure/auth/jwt.js";
import { UnauthorizedError } from "../../domain/errors/AppError.js";

export const autenticar: RequestHandler = (req, _res, next) => {
  const cabecalho = req.headers.authorization;
  if (!cabecalho?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Token não informado.");
  }
  req.funcionario = verificarToken(cabecalho.slice("Bearer ".length));
  next();
};