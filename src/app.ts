import express from "express";
import { routes } from "./api/routes/index.js";
import { notFound } from "./api/middlewares/notFound.js";
import { errorHandler } from "./api/middlewares/errorHandler.js";

export const app = express();

app.use(express.json());
app.use(routes);
app.use(notFound);
app.use(errorHandler);