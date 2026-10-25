import { prisma } from "../../infrastructure/database/prisma.js";

type Paginacao = { page: number; limit: number };

const horario = (valor: Date) => valor.toISOString().slice(11, 16);

export async function listarUnidades({ page, limit }: Paginacao) {
  const filtro = { ativa: true };

  const [total, unidades] = await Promise.all([
    prisma.unidade.count({ where: filtro }),
    prisma.unidade.findMany({
      where: filtro,
      select: {
        id: true,
        cidade: true,
        bairro: true,
        horario_abertura: true,
        horario_fechamento: true,
      },
      orderBy: [{ cidade: "asc" }, { bairro: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const data = unidades.map((unidade) => ({
    id: unidade.id,
    cidade: unidade.cidade,
    bairro: unidade.bairro,
    horarioAbertura: horario(unidade.horario_abertura),
    horarioFechamento: horario(unidade.horario_fechamento),
  }));

  return { data, page, limit, total };
}