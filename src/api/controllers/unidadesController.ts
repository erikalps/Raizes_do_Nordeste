import type { RequestHandler } from "express";
import { validar } from "../validation/validar.js";
import { paginacaoSchema } from "../validation/paginacao.js";
import { listarUnidades } from "../../application/unidades/listarUnidades.js";

export const listar: RequestHandler = async (req, res) => {
  const paginacao = validar(paginacaoSchema, req.query);
  const unidades = await listarUnidades(paginacao);
  res.status(200).json(unidades);
};