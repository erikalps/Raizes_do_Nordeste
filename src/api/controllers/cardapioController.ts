//recebe a requisição do cardápio, confere o que veio nela, chamar o caso de uso e devolve a resposta com o status 200.

import type { RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { consultarCardapio } from "../../application/cardapio/consultarCardapio.js";
import { paginacaoSchema } from "../validation/paginacao.js";

const unidadeParamsSchema = z.object({
  id: z.uuid({ error: "Deve ser um identificador válido." }),
});



export const listarCardapio: RequestHandler = async (req, res) => {
  const { id } = validar(unidadeParamsSchema, req.params);
  const paginacao = validar(paginacaoSchema, req.query);
  const cardapio = await consultarCardapio(id, paginacao);
  res.status(200).json(cardapio);
};