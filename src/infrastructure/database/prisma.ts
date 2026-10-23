import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";

function variavelObrigatoria(nome: string): string {
  const valor = process.env[nome];
  if (!valor) throw new Error(`Variável ${nome} não definida no .env`);
  return valor;
}

const adapter = new PrismaMariaDb({
  host: variavelObrigatoria("DB_HOST"),
  port: Number(variavelObrigatoria("DB_PORT")),
  user: variavelObrigatoria("DB_USER"),
  password: variavelObrigatoria("DB_PASSWORD"),
  database: variavelObrigatoria("DB_NAME"),
  connectionLimit: 5,
  allowPublicKeyRetrieval: true,
});


export const prisma = new PrismaClient({ adapter });