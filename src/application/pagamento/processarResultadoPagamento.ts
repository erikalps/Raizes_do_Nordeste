import { prisma } from "../../infrastructure/database/prisma.js";
import { desfazerReserva } from "../pedido/desfazerReserva.js";
import {MENSAGEM_SEM_RESPOSTA,gerarNumeroRetirada,mensagemDeRecusa,pagamentoVencido} from "../../domain/pagamento/regrasPagamento.js";
import type { MotivoRecusa } from "../../domain/pagamento/regrasPagamento.js";
import { ConflictError, NotFoundError } from "../../domain/errors/AppError.js";

export type DadosResultado =
  | { resultado: "APROVADO" }
  | { resultado: "RECUSADO"; motivo: MotivoRecusa };

type DadosResposta = {
  pedidoId: string;
  statusPedido: string;
  numeroRetirada: string | null;
  identificadorTentativa: string;
  statusPagamento: string;
  motivoRecusa: string | null;
};

function mensagemParaCliente(statusPagamento: string, motivoRecusa: string | null): string {
  if (statusPagamento === "APROVADO") return "Pagamento aprovado.";
  if (statusPagamento === "RECUSADO") {
    return mensagemDeRecusa((motivoRecusa ?? "ERRO_PROCESSAMENTO") as MotivoRecusa);
  }
  return MENSAGEM_SEM_RESPOSTA;
}

function montarResposta(dados: DadosResposta) {
  return {
    pedidoId: dados.pedidoId,
    status: dados.statusPedido,
    numeroRetirada: dados.numeroRetirada,
    pagamento: {
      identificadorTentativa: dados.identificadorTentativa,
      status: dados.statusPagamento,
    },
    mensagem: mensagemParaCliente(dados.statusPagamento, dados.motivoRecusa),
  };
}

export async function processarResultadoPagamento(identificadorTentativa: string, dados: DadosResultado) {
  const agora = new Date();

  return prisma.$transaction(async (tx) => {
    // 1. A tentativa existe?
    const pagamento = await tx.pagamento.findUnique({
      where: { identificador_tentativa: identificadorTentativa },
      include: { pedido: { select: { id: true, status: true, numero_retirada: true } } },
    });
    if (!pagamento) throw new NotFoundError("Tentativa de pagamento não encontrada.");

    // 2. Já foi respondida? Repetição devolve o estado atual 
    if (pagamento.status !== "PENDENTE") {
      const mesmaResposta =
        pagamento.status === dados.resultado || pagamento.status === "SEM_RESPOSTA";
      if (!mesmaResposta) {
        throw new ConflictError(
          "PAGAMENTO_JA_PROCESSADO",
          "Esta tentativa de pagamento já foi respondida com outro resultado.",
        );
      }
      return montarResposta({
        pedidoId: pagamento.pedido.id,
        statusPedido: pagamento.pedido.status,
        numeroRetirada: pagamento.pedido.numero_retirada,
        identificadorTentativa,
        statusPagamento: pagamento.status,
        motivoRecusa: pagamento.motivo_recusa,
      });
    }

    // 3. O pedido ainda espera pagamento?
    if (pagamento.pedido.status !== "AGUARDANDO_PAGAMENTO") {
      throw new ConflictError("TRANSICAO_INVALIDA", "O pedido não está aguardando pagamento.");
    }

    // 4. Resultado final: resposta depois do prazo conta como sem resposta
    const vencido = pagamentoVencido(pagamento.expira_em, agora);
    const statusPagamento = vencido ? "SEM_RESPOSTA" : dados.resultado;
    const motivoRecusa = vencido
      ? `RESPOSTA_APOS_PRAZO:${dados.resultado}`
      : dados.resultado === "RECUSADO"
        ? dados.motivo
        : null;

    // 5. Grava a resposta só se a tentativa ainda estiver pendente
    const atualizado = await tx.pagamento.updateMany({
      where: { identificador_tentativa: identificadorTentativa, status: "PENDENTE" },
      data: { status: statusPagamento, respondido_em: agora, motivo_recusa: motivoRecusa },
    });
    if (atualizado.count === 0) {
      throw new ConflictError("PAGAMENTO_JA_PROCESSADO", "Esta tentativa de pagamento já foi respondida.");
    }

    // 6. Atualiza o pedido
    const pedidoId = pagamento.pedido.id;
    let statusPedido: "PAGO" | "CANCELADO";
    let numeroRetirada: string | null = null;

    if (statusPagamento === "APROVADO") {
      statusPedido = "PAGO";
      numeroRetirada = gerarNumeroRetirada(pedidoId);
      await tx.pedido.update({
        where: { id: pedidoId },
        data: { status: "PAGO", pago_em: agora, numero_retirada: numeroRetirada },
      });
    } else {
      statusPedido = "CANCELADO";
      await tx.pedido.update({
        where: { id: pedidoId },
        data: {
          status: "CANCELADO",
          motivo_cancelamento: vencido ? "PAGAMENTO_SEM_RESPOSTA" : "PAGAMENTO_RECUSADO",
        },
      });
      await desfazerReserva(tx, pedidoId, null);
    }

    // 7. Auditoria
    await tx.registroAuditoria.create({
      data: {
        executado_por_id: null,
        acao: `PAGAMENTO_${statusPagamento}`,
        entidade: "pedido",
        entidade_id: pedidoId,
        valor_anterior: JSON.stringify({ status: "AGUARDANDO_PAGAMENTO" }),
        valor_novo: JSON.stringify({ status: statusPedido, pagamento: statusPagamento }),
      },
    });

    return montarResposta({
      pedidoId,
      statusPedido,
      numeroRetirada,
      identificadorTentativa,
      statusPagamento,
      motivoRecusa,
    });
  });
}