import type { RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { criarPedido } from "../../application/pedido/criarPedido.js";

const itemSchema = z.object({
  produtoId: z.uuid({ error: "Deve ser um identificador válido." }),
  quantidade: z
    .number({ error: "Deve ser um número." })
    .int({ error: "Deve ser um número inteiro." })
    .min(1, { error: "Deve ser 1 ou mais." })
    .max(50, { error: "Deve ser no máximo 50." }),
});

const criarPedidoSchema = z.object({
  unidadeId: z.uuid({ error: "Deve ser um identificador válido." }),
  canalPedido: z.enum(["APP", "TOTEM", "BALCAO"], {
    error: "Campo obrigatório: APP, TOTEM ou BALCAO.",
  }),
  formaPagamento: z.enum(["CARTAO", "PIX", "DINHEIRO"], {
    error: "Campo obrigatório: CARTAO, PIX ou DINHEIRO.",
  }),
  cpf: z
    .string({ error: "Deve ser um texto." })
    .regex(/^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/, { error: "CPF em formato inválido." })
    .optional(),
  itens: z
    .array(itemSchema, { error: "Deve ser uma lista de itens." })
    .min(1, { error: "O pedido precisa de pelo menos um item." })
    .max(20, { error: "O pedido pode ter no máximo 20 itens." }),
});

export const criar: RequestHandler = async (req, res) => {
  const dados = validar(criarPedidoSchema, req.body);
  const pedido = await criarPedido(dados, req.funcionario);
  res.status(201).json(pedido);
};