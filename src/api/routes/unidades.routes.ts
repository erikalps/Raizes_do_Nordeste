import { Router } from "express";
import { listarFuncionarios } from "../controllers/authController.js";

export const unidadesRoutes = Router();

unidadesRoutes.get("/:id/funcionarios", listarFuncionarios);