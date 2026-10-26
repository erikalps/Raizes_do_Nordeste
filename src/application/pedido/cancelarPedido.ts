import { prisma } from "../../infrastructure/database/prisma.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { desfazerReserva } from "./desfazerReserva.js";
import { podeMudarStatus } from "../../domain/pedido/transicoesStatus.js";
import { podeAtenderNoBalcao } from "../../domain/pedido/regrasPedido.js";
import { ConflictError, ForbiddenError, NotFoundError } from "../../domain/errors/AppError.js";

const STATUS_APOS_INICIO_DO_PREPARO = ["EM_PREPARO", "PRONTO", "RETIRADO", "NAO_RETIRADO"];

export async function cancelarPedido(pedidoId: string, funcionario?: FuncionarioAutenticado) {
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    // 1. O pedido existe?
    const pedido = await tx.pedido.findUnique({
      where: { id: pedidoId },
      select: { id: true, unidade_id: true, status: true },
    });
    if (!pedido) throw new NotFoundError("Pedido não encontrado.");

    // 2. Com token: atendente ou gerente da própria unidade
    if (funcionario) {
      if (!podeAtenderNoBalcao(funcionario.papel)) {
        throw new ForbiddenError("Só atendentes e gerentes podem cancelar pedidos para o cliente.");
      }
      if (funcionario.unidadeId !== pedido.unidade_id) {
        throw new ForbiddenError("O funcionário só pode cancelar pedidos da própria unidade.");
      }
    }

    // 3. Ainda pode ser cancelado?
    if (!podeMudarStatus(pedido.status, "CANCELADO")) {
      const mensagem = STATUS_APOS_INICIO_DO_PREPARO.includes(pedido.status)
        ? "O pedido já entrou em preparo e não pode mais ser cancelado."
        : "O pedido já está encerrado.";
      throw new ConflictError("CANCELAMENTO_NAO_PERMITIDO", mensagem);
    }

    // 4. Pagamento primeiro (mesma ordem do processamento do pagamento)
    await tx.pagamento.updateMany({
      where: { pedido_id: pedidoId, status: "PENDENTE" },
      data: { status: "CANCELADO", respondido_em: agora },
    });
    const estorno = await tx.pagamento.updateMany({
      where: { pedido_id: pedidoId, status: "APROVADO" },
      data: { status: "ESTORNADO" },
    });

    // 5. Pedido, só se o status não mudou desde a leitura
    const atualizado = await tx.pedido.updateMany({
      where: { id: pedidoId, status: pedido.status },
      data: { status: "CANCELADO", motivo_cancelamento: "CLIENTE", finalizado_em: agora },
    });
    if (atualizado.count === 0) {
      throw new ConflictError(
        "CANCELAMENTO_NAO_PERMITIDO",
        "O status do pedido foi alterado por outra ação. Consulte o pedido e tente de novo.",
      );
    }

    // 6. Devolve os ingredientes e descarta os pontos pendentes
    const funcionarioId = funcionario?.id ?? null;
    await desfazerReserva(tx, pedidoId, funcionarioId);

    // 7. Auditoria
    await tx.registroAuditoria.create({
      data: {
        executado_por_id: funcionarioId,
        acao: "CANCELAR_PEDIDO",
        entidade: "pedido",
        entidade_id: pedidoId,
        motivo: "CLIENTE",
        valor_anterior: JSON.stringify({ status: pedido.status }),
        valor_novo: JSON.stringify({ status: "CANCELADO", estorno: estorno.count > 0 }),
      },
    });

    const houveEstorno = estorno.count > 0;
    return {
      pedidoId,
      status: "CANCELADO",
      estorno: houveEstorno,
      mensagem: houveEstorno
        ? "Pedido cancelado. O valor pago será estornado."
        : "Pedido cancelado.",
    };
  });
}