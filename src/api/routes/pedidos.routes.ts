import { Router } from "express";
import { cancelar, criar } from "../controllers/pedidoController.js";
import { preparo, pronto, retirada } from "../controllers/statusPedidoController.js";
import { autenticacaoOpcional } from "../middlewares/autenticacaoOpcional.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizar } from "../middlewares/autorizar.js";

export const pedidosRoutes = Router();

pedidosRoutes.post("/", autenticacaoOpcional, criar);
pedidosRoutes.post("/:id/cancelamento", autenticacaoOpcional, cancelar);
pedidosRoutes.post("/:id/preparo", autenticar, autorizar("COZINHEIRO"), preparo);
pedidosRoutes.post("/:id/pronto", autenticar, autorizar("COZINHEIRO"), pronto);
pedidosRoutes.post("/:id/retirada", autenticar, autorizar("ATENDENTE", "GERENTE"), retirada);