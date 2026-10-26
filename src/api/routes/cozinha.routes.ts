import { Router } from "express";
import { fila } from "../controllers/statusPedidoController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizar } from "../middlewares/autorizar.js";

export const cozinhaRoutes = Router();

cozinhaRoutes.get("/fila", autenticar, autorizar("COZINHEIRO", "GERENTE"), fila);