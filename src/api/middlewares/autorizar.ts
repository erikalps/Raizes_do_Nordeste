import type { RequestHandler } from "express";
import type { Papel } from "../../generated/prisma/client.js";
import { ForbiddenError, UnauthorizedError } from "../../domain/errors/AppError.js";

export function autorizar(...papeisPermitidos: Papel[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.funcionario) throw new UnauthorizedError("Token não informado.");
    if (!papeisPermitidos.includes(req.funcionario.papel)) {
      throw new ForbiddenError("Seu perfil não tem permissão para esta ação.");
    }
    next();
  };
}