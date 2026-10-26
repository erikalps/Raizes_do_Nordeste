import { prisma } from "../../infrastructure/database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { ForbiddenError } from "../../domain/errors/AppError.js";

type Paginacao = { page: number; limit: number };

export async function listarFilaCozinha(funcionario: FuncionarioAutenticado, { page, limit }: Paginacao) {
  if (!funcionario.unidadeId) {
    throw new ForbiddenError("A fila da cozinha é exclusiva dos funcionários de uma unidade.");
  }

  const filtro: Prisma.PedidoWhereInput = {
    unidade_id: funcionario.unidadeId,
    status: { in: ["PAGO", "EM_PREPARO"] },
  };

  const [total, pedidos] = await Promise.all([
    prisma.pedido.count({ where: filtro }),
    prisma.pedido.findMany({
      where: filtro,
      orderBy: { pago_em: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        numero_retirada: true,
        canal_pedido: true,
        status: true,
        pago_em: true,
        preparo_iniciado_em: true,
        itens: { select: { quantidade: true, produto: { select: { nome: true } } } },
      },
    }),
  ]);

  const data = pedidos.map((pedido) => ({
    pedidoId: pedido.id,
    numeroRetirada: pedido.numero_retirada,
    canalPedido: pedido.canal_pedido,
    status: pedido.status,
    pagoEm: pedido.pago_em,
    preparoIniciadoEm: pedido.preparo_iniciado_em,
    itens:
      pedido.status === "EM_PREPARO"
        ? pedido.itens.map((item) => ({ nome: item.produto.nome, quantidade: item.quantidade }))
        : null,
  }));

  return { data, page, limit, total };
}