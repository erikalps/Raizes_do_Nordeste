import type { RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { MOTIVOS_RECUSA } from "../../domain/pagamento/regrasPagamento.js";
import { processarResultadoPagamento } from "../../application/pagamento/processarResultadoPagamento.js";

const tentativaParamsSchema = z.object({
  id: z.uuid({ error: "Deve ser um identificador válido." }),
});

const resultadoSchema = z.discriminatedUnion(
  "resultado",
  [
    z.object({ resultado: z.literal("APROVADO") }),
    z.object({
      resultado: z.literal("RECUSADO"),
      motivo: z.enum(MOTIVOS_RECUSA, { error: "Motivo de recusa inválido ou ausente." }),
    }),
  ],
  { error: "Campo obrigatório: APROVADO ou RECUSADO." },
);

export const registrarResultado: RequestHandler = async (req, res) => {
  const { id } = validar(tentativaParamsSchema, req.params);
  const dados = validar(resultadoSchema, req.body);
  const resposta = await processarResultadoPagamento(id, dados);
  res.status(200).json(resposta);
};