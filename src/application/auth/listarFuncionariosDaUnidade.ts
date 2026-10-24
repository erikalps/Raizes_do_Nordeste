import { prisma } from "../../infrastructure/database/prisma.js";
import { NotFoundError } from "../../domain/errors/AppError.js";

export async function listarFuncionariosDaUnidade(unidadeId: string) {
    const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
        select: { id: true },
    })

    if (!unidade) throw new NotFoundError("Unidade não encontrada.");

    return prisma.funcionario.findMany({
        where: { unidade_id: unidadeId, ativo: true },
        select: { id: true, nome: true },
        orderBy: { nome: "asc" },
    });
}
