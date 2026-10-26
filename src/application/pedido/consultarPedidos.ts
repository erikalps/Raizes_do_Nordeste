import { prisma } from "../../infrastructure/database/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import type { CanalPedido } from "../../domain/pedido/regrasPedido.js";
import type { StatusPedido } from "../../domain/pedido/transicoesStatus.js";
import { ForbiddenError, NotFoundError } from "../../domain/errors/AppError.js";

const PAPEIS_DA_MATRIZ = ["ADMINISTRADOR", "CONSULTOR"];

const ehDaMatriz = (funcionario: FuncionarioAutenticado) => PAPEIS_DA_MATRIZ.includes(funcionario.papel);

export type FiltrosPedidos = {
  page: number;
  limit: number;
  canalPedido?: CanalPedido | undefined;
  status?: StatusPedido | undefined;
  unidadeId?: string | undefined;
};

// Decide de qual unidade os pedidos podem ser listados
function unidadeDaConsulta(funcionario: FuncionarioAutenticado, unidadeFiltro?: string): string | undefined {
  if (ehDaMatriz(funcionario)) return unidadeFiltro;

  if (!funcionario.unidadeId) {
    throw new ForbiddenError("Funcionário sem unidade não pode consultar pedidos.");
  }
  if (unidadeFiltro && unidadeFiltro !== funcionario.unidadeId) {
    throw new ForbiddenError("Só é possível consultar pedidos da própria unidade.");
  }
  return funcionario.unidadeId;
}

export async function listarPedidos(funcionario: FuncionarioAutenticado, filtros: FiltrosPedidos) {
  const unidadeId = unidadeDaConsulta(funcionario, filtros.unidadeId);

  const filtro: Prisma.PedidoWhereInput = {};
  if (unidadeId) filtro.unidade_id = unidadeId;
  if (filtros.canalPedido) filtro.canal_pedido = filtros.canalPedido;
  if (filtros.status) filtro.status = filtros.status;

  const [total, pedidos] = await Promise.all([
    prisma.pedido.count({ where: filtro }),
    prisma.pedido.findMany({
      where: filtro,
      orderBy: { criado_em: "desc" },
      skip: (filtros.page - 1) * filtros.limit,
      take: filtros.limit,
      select: {
        id: true,
        unidade_id: true,
        canal_pedido: true,
        status: true,
        numero_retirada: true,
        valor_pago: true,
        criado_em: true,
      },
    }),
  ]);

  const data = pedidos.map((pedido) => ({
    pedidoId: pedido.id,
    unidadeId: pedido.unidade_id,
    canalPedido: pedido.canal_pedido,
    status: pedido.status,
    numeroRetirada: pedido.numero_retirada,
    total: pedido.valor_pago.toFixed(2),
    criadoEm: pedido.criado_em,
  }));

  return { data, page: filtros.page, limit: filtros.limit, total };
}

export async function buscarPedido(pedidoId: string, funcionario?: FuncionarioAutenticado) {
  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    select: {
      id: true,
      unidade_id: true,
      canal_pedido: true,
      status: true,
      motivo_cancelamento: true,
      numero_retirada: true,
      valor_pago: true,
      criado_em: true,
      pago_em: true,
      preparo_iniciado_em: true,
      pronto_em: true,
      finalizado_em: true,
      itens: {
        select: { quantidade: true, preco_unitario: true, produto: { select: { nome: true } } },
      },
      pagamentos: {
        select: { forma: true, status: true },
        orderBy: { criado_em: "desc" },
        take: 1,
      },
    },
  });
  if (!pedido) throw new NotFoundError("Pedido não encontrado.");

  // Com token: funcionário da unidade do pedido, ou da matriz
  if (funcionario && !ehDaMatriz(funcionario) && funcionario.unidadeId !== pedido.unidade_id) {
    throw new ForbiddenError("Só é possível consultar pedidos da própria unidade.");
  }

  const pagamento = pedido.pagamentos[0];

  return {
    pedidoId: pedido.id,
    unidadeId: pedido.unidade_id,
    canalPedido: pedido.canal_pedido,
    status: pedido.status,
    motivoCancelamento: pedido.motivo_cancelamento,
    numeroRetirada: pedido.numero_retirada,
    total: pedido.valor_pago.toFixed(2),
    itens: pedido.itens.map((item) => ({
      nome: item.produto.nome,
      quantidade: item.quantidade,
      precoUnitario: item.preco_unitario.toFixed(2),
    })),
    pagamento: pagamento ? { forma: pagamento.forma, status: pagamento.status } : null,
    datas: {
      criadoEm: pedido.criado_em,
      pagoEm: pedido.pago_em,
      preparoIniciadoEm: pedido.preparo_iniciado_em,
      prontoEm: pedido.pronto_em,
      finalizadoEm: pedido.finalizado_em,
    },
  };
}