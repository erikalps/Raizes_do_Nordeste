import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { paginacaoSchema } from "../validation/paginacao.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { UnauthorizedError } from "../../domain/errors/AppError.js";
import { listarFilaCozinha } from "../../application/pedido/listarFilaCozinha.js";
import {
  iniciarPreparo,
  marcarPronto,
  registrarRetirada,
} from "../../application/pedido/avancarStatusPedido.js";

const pedidoParamsSchema = z.object({
  id: z.uuid({ error: "Deve ser um identificador válido." }),
});

function exigirFuncionario(req: Request): FuncionarioAutenticado {
  if (!req.funcionario) throw new UnauthorizedError("Token não informado.");
  return req.funcionario;
}

export const fila: RequestHandler = async (req, res) => {
  const funcionario = exigirFuncionario(req);
  const paginacao = validar(paginacaoSchema, req.query);
  res.status(200).json(await listarFilaCozinha(funcionario, paginacao));
};

export const preparo: RequestHandler = async (req, res) => {
  const funcionario = exigirFuncionario(req);
  const { id } = validar(pedidoParamsSchema, req.params);
  res.status(200).json(await iniciarPreparo(id, funcionario));
};

export const pronto: RequestHandler = async (req, res) => {
  const funcionario = exigirFuncionario(req);
  const { id } = validar(pedidoParamsSchema, req.params);
  res.status(200).json(await marcarPronto(id, funcionario));
};

export const retirada: RequestHandler = async (req, res) => {
  const funcionario = exigirFuncionario(req);
  const { id } = validar(pedidoParamsSchema, req.params);
  res.status(200).json(await registrarRetirada(id, funcionario));
};