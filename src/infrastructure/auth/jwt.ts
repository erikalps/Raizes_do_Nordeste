import jwt from "jsonwebtoken";
import type { Papel } from "../../generated/prisma/client.js";
import { UnauthorizedError } from "../../domain/errors/AppError.js";

export type FuncionarioAutenticado = {
    id: string;
    papel: Papel;
    unidadeId: string | null; // aceita null pq o adm não pertence a nenhuma unidade

}

const DURACAO_TOKEN = "8h";

function segredo(): string {
    const valor = process.env.JWT_SECRET
    if (!valor) throw new Error("Variável JWT_SECRET não definida no .env");
    return valor;
}

export function gerarToken(funcionario: FuncionarioAutenticado): string {
    return jwt.sign(
        { papel: funcionario.papel, unidadeId: funcionario.unidadeId },
        segredo(),
        { subject: funcionario.id, expiresIn: DURACAO_TOKEN },
    );
}

export function verificarToken(token: string): FuncionarioAutenticado {
  try {
    const dados = jwt.verify(token, segredo());
    if (typeof dados === "string" || !dados.sub) throw new Error();
    return {
      id: dados.sub,
      papel: dados.papel as Papel,
      unidadeId: (dados.unidadeId as string | null) ?? null,
    };
  } catch {
    throw new UnauthorizedError("Token inválido ou expirado.");
  }
}