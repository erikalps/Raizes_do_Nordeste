import type { Request, RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { paginacaoSchema } from "../validation/paginacao.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { UnauthorizedError } from "../../domain/errors/AppError.js";
import { buscarPedido, listarPedidos } from "../../application/pedido/consultarPedidos.js";

const filtrosSchema = paginacaoSchema.extend({
  canalPedido: z
    .enum(["APP", "TOTEM", "BALCAO"], { error: "Deve ser APP, TOTEM ou BALCAO." })
    .optional(),
  status: z
    .enum(
      ["AGUARDANDO_PAGAMENTO", "PAGO", "EM_PREPARO", "PRONTO", "RETIRADO", "CANCELADO", "NAO_RETIRADO"],
      { error: "Status inválido." },
    )
    .optional(),
  unidadeId: z.uuid({ error: "Deve ser um identificador válido." }).optional(),
});

const pedidoParamsSchema = z.object({
  id: z.uuid({ error: "Deve ser um identificador válido." }),
});

function exigirFuncionario(req: Request): FuncionarioAutenticado {
  if (!req.funcionario) throw new UnauthorizedError("Token não informado.");
  return req.funcionario;
}

export const listar: RequestHandler = async (req, res) => {
  const funcionario = exigirFuncionario(req);
  const filtros = validar(filtrosSchema, req.query);
  res.status(200).json(await listarPedidos(funcionario, filtros));
};

export const detalhar: RequestHandler = async (req, res) => {
  const { id } = validar(pedidoParamsSchema, req.params);
  res.status(200).json(await buscarPedido(id, req.funcionario));
};