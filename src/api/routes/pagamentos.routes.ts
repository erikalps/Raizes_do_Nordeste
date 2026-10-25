import { Router } from "express";
import { registrarResultado } from "../controllers/pagamentoController.js";

export const pagamentosRoutes = Router();

pagamentosRoutes.post("/:id/resultado", registrarResultado);