import { Router } from "express";
import { funcionarioLogado, login } from "../controllers/authController.js";
import { autenticar } from "../middlewares/autenticar.js";

export const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.get("/me", autenticar, funcionarioLogado);