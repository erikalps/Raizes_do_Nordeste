import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

const caminho = join(process.cwd(), "docs", "openapi.yaml");
const documento = parse(readFileSync(caminho, "utf8"));

export const docsRoutes = Router();

docsRoutes.use("/", swaggerUi.serve, swaggerUi.setup(documento));