import { prisma } from "../../infrastructure/database/prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import { hashCpf } from "../../infrastructure/crypto/dadosPessoais.js";
import type { FuncionarioAutenticado } from "../../infrastructure/auth/jwt.js";
import { vendaSazonalLiberada } from "../../domain/cardapio/disponibilidade.js";
import type { IngredienteDaReceita } from "../../domain/cardapio/disponibilidade.js";
import {calcularPontos,dentroDoHorario,exigeHorarioDeFuncionamento,formaPagamentoPermitida,prazoDoPagamento,somarIngredientes,} from "../../domain/pedido/regrasPedido.js";
import { podeAtenderNoBalcao, type CanalPedido, type FormaPagamento, type ItemSolicitado } from "../../domain/pedido/regrasPedido.js";
import {ConflictError,ForbiddenError,NotFoundError,UnauthorizedError,ValidationError,} from "../../domain/errors/AppError.js";

const FUSO_HORARIO = "America/Sao_Paulo";


export type DadosPedido = {
    unidadeId: string;
    canalPedido: CanalPedido;
    formaPagamento: FormaPagamento;
    cpf?: string | undefined;
    itens: ItemSolicitado[];
};

function minutosAgora(agora: Date): number {
    const partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: FUSO_HORARIO,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
    }).formatToParts(agora);
    const hora = Number(partes.find((p) => p.type === "hour")?.value);
    const minuto = Number(partes.find((p) => p.type === "minute")?.value);
    return hora * 60 + minuto;
}

function dataDeHoje(agora: Date): string {
    return agora.toLocaleDateString("sv-SE", { timeZone: FUSO_HORARIO });
}

export async function criarPedido(dados: DadosPedido, funcionario?: FuncionarioAutenticado) {
    const agora = new Date();

    // 1. Forma de pagamento permitida no canal
    if (!formaPagamentoPermitida(dados.canalPedido, dados.formaPagamento)) {
        throw new ValidationError([
            { field: "formaPagamento", issue: "Pagamento em dinheiro só é aceito no balcão." },
        ]);
    }

    // 2. Balcão exige atendente ou gerente da própria unidade
    if (dados.canalPedido === "BALCAO") {
        if (!funcionario) {
            throw new UnauthorizedError("Pedido no balcão exige o login do atendente ou do gerente.");
        }
        if (!podeAtenderNoBalcao(funcionario.papel)) {
            throw new ForbiddenError("Só atendentes e gerentes podem registrar pedidos no balcão.");
        }
        if (funcionario.unidadeId !== dados.unidadeId) {
            throw new ForbiddenError("O funcionário só pode registrar pedidos na própria unidade.");
        }
    }
    const registradoPorId = dados.canalPedido === "BALCAO" && funcionario ? funcionario.id : null;

    // 3. Unidade existe, está ativa e, para app e totem, aberta
    const unidade = await prisma.unidade.findUnique({
        where: { id: dados.unidadeId },
        select: { ativa: true, horario_abertura: true, horario_fechamento: true },
    });
    if (!unidade || !unidade.ativa) throw new NotFoundError("Unidade não encontrada.");

    if (
        exigeHorarioDeFuncionamento(dados.canalPedido) &&
        !dentroDoHorario(unidade.horario_abertura, unidade.horario_fechamento, minutosAgora(agora))
    ) {
        throw new ConflictError("UNIDADE_FECHADA", "A unidade está fora do horário de funcionamento.");
    }

    // 4. Produtos no cardápio da unidade, com receita
    const idsProdutos = [...new Set(dados.itens.map((item) => item.produtoId))];

    const produtosDaUnidade = await prisma.produtoUnidade.findMany({
        where: { unidade_id: dados.unidadeId, produto_id: { in: idsProdutos }, oferecido: true },
        include: {
            produto: {
                include: { itens_receita: { select: { ingrediente_id: true, quantidade: true } } },
            },
        },
    });

    if (produtosDaUnidade.length !== idsProdutos.length) {
        throw new NotFoundError("Um ou mais produtos não estão no cardápio desta unidade.");
    }

    const hoje = dataDeHoje(agora);
    for (const item of produtosDaUnidade) {
        const liberado = vendaSazonalLiberada(
            {
                sazonal: item.produto.sazonal,
                sazonalAtivo: item.sazonal_ativo,
                inicioJanela: item.produto.inicio_janela,
                fimJanela: item.produto.fim_janela,
            },
            hoje,
        );
        if (!liberado) {
            throw new ConflictError("PRODUTO_INDISPONIVEL", `${item.produto.nome} está fora do período de venda.`);
        }
    }

    const porProduto = new Map(produtosDaUnidade.map((item) => [item.produto_id, item]));

    // 5. Preços e total, calculados pelo servidor
    let total = new Prisma.Decimal(0);
    const itensDoPedido = dados.itens.map((item) => {
        const produtoDaUnidade = porProduto.get(item.produtoId)!;
        const precoUnitario = produtoDaUnidade.preco_unidade ?? produtoDaUnidade.produto.preco_base;
        total = total.add(precoUnitario.mul(item.quantidade));
        return {
            produtoId: item.produtoId,
            nome: produtoDaUnidade.produto.nome,
            quantidade: item.quantidade,
            precoUnitario,
        };
    });

    // 6. Quanto de cada ingrediente o pedido consome
    const receitas = new Map<string, IngredienteDaReceita[]>(
        produtosDaUnidade.map((item) => [
            item.produto_id,
            item.produto.itens_receita.map((r) => ({
                ingredienteId: r.ingrediente_id,
                quantidade: r.quantidade.toNumber(),
            })),
        ]),
    );
    const necessidade = somarIngredientes(dados.itens, receitas);

    // 7. Cliente cadastrado e pontos pendentes
    let clienteId: string | null = null;
    let pontosGanhos = 0;
    if (dados.cpf) {
        const cliente = await prisma.cliente.findUnique({
            where: { cpf_hash: hashCpf(dados.cpf) },
            select: { id: true },
        });
        const configuracao = await prisma.configuracaoFidelidade.findFirst();
        if (cliente && configuracao) {
            clienteId = cliente.id;
            pontosGanhos = calcularPontos(total.toNumber(), configuracao.pontos_por_real.toNumber());
        }
    }

    // 8. Transação: tudo ou nada
    const pedido = await prisma.$transaction(async (tx) => {
        const estoques = await tx.estoqueIngrediente.findMany({
            where: { unidade_id: dados.unidadeId, ingrediente_id: { in: [...necessidade.keys()] } },
            select: { id: true, ingrediente_id: true },
        });
        const estoquePorIngrediente = new Map(estoques.map((e) => [e.ingrediente_id, e.id]));

        for (const [ingredienteId, quantidade] of necessidade) {
            const resultado = await tx.estoqueIngrediente.updateMany({
                where: {
                    unidade_id: dados.unidadeId,
                    ingrediente_id: ingredienteId,
                    quantidade: { gte: quantidade },
                },
                data: { quantidade: { decrement: quantidade } },
            });
            if (resultado.count === 0) {
                throw new ConflictError(
                    "ESTOQUE_INSUFICIENTE",
                    "Não há quantidade suficiente para um ou mais itens.",
                );
            }
        }

        const criado = await tx.pedido.create({
            data: {
                unidade_id: dados.unidadeId,
                cliente_id: clienteId,
                registrado_por_id: registradoPorId,
                canal_pedido: dados.canalPedido,
                status: "AGUARDANDO_PAGAMENTO",
                valor_bruto: total,
                valor_pago: total,
                pontos_ganhos: pontosGanhos,
                status_pontos: clienteId ? "PENDENTE" : null,
                itens: {
                    create: itensDoPedido.map((item) => ({
                        produto_id: item.produtoId,
                        quantidade: item.quantidade,
                        preco_unitario: item.precoUnitario,
                    })),
                },
                pagamentos: {
                    create: {
                        forma: dados.formaPagamento,
                        status: "PENDENTE",
                        valor: total,
                        expira_em: prazoDoPagamento(dados.canalPedido, agora),
                    },
                },
            },
            include: { pagamentos: true },
        });

        await tx.movimentacaoEstoque.createMany({
            data: [...necessidade].map(([ingredienteId, quantidade]) => ({
                estoque_ingrediente_id: estoquePorIngrediente.get(ingredienteId)!,
                funcionario_id: registradoPorId,
                pedido_id: criado.id,
                tipo: "RESERVA",
                quantidade,
            })),
        });

        await tx.registroAuditoria.create({
            data: {
                executado_por_id: registradoPorId,
                acao: "CRIAR_PEDIDO",
                entidade: "pedido",
                entidade_id: criado.id,
                valor_novo: JSON.stringify({
                    status: criado.status,
                    canal: criado.canal_pedido,
                    valor: total.toFixed(2),
                }),
            },
        });

        return criado;
    });

    // 9. Resposta, sem dados pessoais
    const pagamento = pedido.pagamentos[0]!;
    return {
        pedidoId: pedido.id,
        status: pedido.status,
        canalPedido: pedido.canal_pedido,
        total: total.toFixed(2),
        itens: itensDoPedido.map((item) => ({
            produtoId: item.produtoId,
            nome: item.nome,
            quantidade: item.quantidade,
            precoUnitario: item.precoUnitario.toFixed(2),
        })),
        pagamento: {
            identificadorTentativa: pagamento.identificador_tentativa,
            forma: pagamento.forma,
            status: pagamento.status,
            expiraEm: pagamento.expira_em,
        },
    };
}