import { Router } from "express";
import { criar } from "../controllers/pedidoController.js";
import { autenticacaoOpcional } from "../middlewares/autenticacaoOpcional.js";

export const pedidosRoutes = Router();

pedidosRoutes.post("/", autenticacaoOpcional, criar);