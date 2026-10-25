import type { RequestHandler } from "express";
import { verificarToken } from "../../infrastructure/auth/jwt.js";
import { UnauthorizedError } from "../../domain/errors/AppError.js";

export const autenticacaoOpcional: RequestHandler = (req, _res, next) => {
  const cabecalho = req.headers.authorization;

  if (!cabecalho) {
    next();
    return;
  }

  if (!cabecalho.startsWith("Bearer ")) {
    throw new UnauthorizedError("Formato do token inválido.");
  }

  req.funcionario = verificarToken(cabecalho.slice("Bearer ".length));
  next();
};