//desfaz o que a criação do pedido reservou: devolve os ingredientes ao estoque e descarta os pontos pendentes

import type { Prisma } from "../../generated/prisma/client.js";

export async function desfazerReserva(
  tx: Prisma.TransactionClient,
  pedidoId: string,
  funcionarioId: string | null,
): Promise<void> {
  const jaDevolvido = await tx.movimentacaoEstoque.count({
    where: { pedido_id: pedidoId, tipo: "DEVOLUCAO" },
  });
  if (jaDevolvido > 0) return;

  const reservas = await tx.movimentacaoEstoque.findMany({
    where: { pedido_id: pedidoId, tipo: "RESERVA" },
    select: { estoque_ingrediente_id: true, quantidade: true },
  });

  for (const reserva of reservas) {
    await tx.estoqueIngrediente.update({
      where: { id: reserva.estoque_ingrediente_id },
      data: { quantidade: { increment: reserva.quantidade } },
    });
  }

  if (reservas.length > 0) {
    await tx.movimentacaoEstoque.createMany({
      data: reservas.map((reserva) => ({
        estoque_ingrediente_id: reserva.estoque_ingrediente_id,
        funcionario_id: funcionarioId,
        pedido_id: pedidoId,
        tipo: "DEVOLUCAO",
        quantidade: reserva.quantidade,
      })),
    });
  }

  await tx.pedido.updateMany({
    where: { id: pedidoId, status_pontos: "PENDENTE" },
    data: { status_pontos: "DESCARTADO" },
  });
}