import { prisma } from "../../infrastructure/database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { podeMudarStatus } from "./transicoesStatus.js";
import type { StatusPedido } from "../../generated/prisma/client.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../domain/errors/AppError.js";

type DadosExtras = Prisma.PedidoUncheckedUpdateManyInput;

async function mudarStatus(
  tx: Prisma.TransactionClient,
  pedidoId: string,
  funcionario: FuncionarioAutenticado,
  novoStatus: StatusPedido,
  dadosExtras: DadosExtras,
) {
  // 1. O pedido existe?
  const pedido = await tx.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      unidade_id: true,
      status: true,
      numero_retirada: true,
      cliente_id: true,
      status_pontos: true,
      pontos_ganhos: true,
    },
  });
  if (!pedido) throw new NotFoundError("Pedido não encontrado.");

  // 2. É da unidade do funcionário?
  if (pedido.unidade_id !== funcionario.unidadeId) {
    throw new ForbiddenError("O funcionário só pode alterar pedidos da própria unidade.");
  }

  // 3. A mudança respeita a ordem dos status?
  if (!podeMudarStatus(pedido.status, novoStatus)) {
    throw new ConflictError(
      "TRANSICAO_INVALIDA",
      `Não é possível mudar o pedido de ${pedido.status} para ${novoStatus}.`,
    );
  }

  // 4. Muda o status só se ninguém mudou antes
  const atualizado = await tx.pedido.updateMany({
    where: { id: pedidoId, status: pedido.status },
    data: { status: novoStatus, ...dadosExtras },
  });
  if (atualizado.count === 0) {
    throw new ConflictError("TRANSICAO_INVALIDA", "O status do pedido foi alterado por outra ação. Atualize a tela.");
  }

  // 5. Auditoria: Registra quem mudou, e de qual status para qual
  await tx.registroAuditoria.create({
    data: {
      executado_por_id: funcionario.id,
      acao: `STATUS_${novoStatus}`,
      entidade: "pedido",
      entidade_id: pedidoId,
      valor_anterior: JSON.stringify({ status: pedido.status }),
      valor_novo: JSON.stringify({ status: novoStatus }),
    },
  });

  return pedido;
}

export async function iniciarPreparo(pedidoId: string, funcionario: FuncionarioAutenticado) {
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    const pedido = await mudarStatus(tx, pedidoId, funcionario, "EM_PREPARO", {
      preparado_por_id: funcionario.id,
      preparo_iniciado_em: agora,
    });

    // Pontos pendentes viram confirmados e entram no saldo do cliente
    if (pedido.cliente_id && pedido.status_pontos === "PENDENTE") {
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { status_pontos: "CONFIRMADO" },
      });
      await tx.cliente.update({
        where: { id: pedido.cliente_id },
        data: { saldo_pontos: { increment: pedido.pontos_ganhos } },
      });
    }

    // Agora os itens podem ser mostrados à cozinha
    const itens = await tx.itemPedido.findMany({
      where: { pedido_id: pedidoId },
      select: { quantidade: true, produto: { select: { nome: true } } },
    });

    return {
      pedidoId,
      status: "EM_PREPARO",
      numeroRetirada: pedido.numero_retirada,
      itens: itens.map((item) => ({ nome: item.produto.nome, quantidade: item.quantidade })),
    };
  });
}

export async function marcarPronto(pedidoId: string, funcionario: FuncionarioAutenticado) {
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    const pedido = await mudarStatus(tx, pedidoId, funcionario, "PRONTO", {
      pronto_em: agora,
    });

    return { pedidoId, status: "PRONTO", numeroRetirada: pedido.numero_retirada };
  });
}

export async function registrarRetirada(pedidoId: string, funcionario: FuncionarioAutenticado) {
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    const pedido = await mudarStatus(tx, pedidoId, funcionario, "RETIRADO", {
      entregue_por_id: funcionario.id,
      finalizado_em: agora,
    });

    return { pedidoId, status: "RETIRADO", numeroRetirada: pedido.numero_retirada };
  });
}