import { Router } from "express";
import { listarFuncionarios } from "../controllers/authController.js";
import { listarCardapio } from "../controllers/cardapioController.js";

export const unidadesRoutes = Router();

unidadesRoutes.get("/:id/funcionarios", listarFuncionarios);
unidadesRoutes.get("/:id/produtos", listarCardapio);