import type { RequestHandler } from "express";
import { z } from "zod";
import { validar } from "../validation/validar.js";
import { realizarLogin } from "../../application/auth/realizarLogin.js";
import { listarFuncionariosDaUnidade } from "../../application/auth/listarFuncionariosDaUnidade.js";

const loginSchema = z.object({
  funcionarioId: z.uuid({ error: "Deve ser um identificador válido." }),
  codigo: z.string({ error: "Campo obrigatório." }).regex(/^\d{4}$/, { error: "Deve ter 4 dígitos." }),
});

const unidadeParamsSchema = z.object({
  id: z.uuid({ error: "Deve ser um identificador válido." }),
});

export const login: RequestHandler = async (req, res) => {
  const { funcionarioId, codigo } = validar(loginSchema, req.body);
  const resultado = await realizarLogin(funcionarioId, codigo);
  res.status(200).json(resultado);
};

export const funcionarioLogado: RequestHandler = (req, res) => {
  res.status(200).json(req.funcionario);
};

export const listarFuncionarios: RequestHandler = async (req, res) => {
  const { id } = validar(unidadeParamsSchema, req.params);
  const funcionarios = await listarFuncionariosDaUnidade(id);
  res.status(200).json(funcionarios);
};