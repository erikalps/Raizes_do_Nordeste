import { Router } from "express";
import { listarFuncionarios } from "../controllers/authController.js";
import { listarCardapio } from "../controllers/cardapioController.js";
import { listar } from "../controllers/unidadesController.js";


export const unidadesRoutes = Router();

unidadesRoutes.get("/", listar);
unidadesRoutes.get("/:id/funcionarios", listarFuncionarios);
unidadesRoutes.get("/:id/produtos", listarCardapio);