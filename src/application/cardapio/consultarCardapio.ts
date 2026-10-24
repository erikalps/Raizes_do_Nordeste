import { prisma } from "../../infrastructure/database/prisma.js";
import { NotFoundError } from "../../domain/errors/AppError.js";
import { produtoDisponivel } from "../../domain/cardapio/disponibilidade.js";

const FUSO_HORARIO = "America/Sao_Paulo";

function dataDeHoje(): string {
    return new Date().toLocaleDateString("sv-SE", { timeZone: FUSO_HORARIO });
}

type Paginacao = {
    page: number;
    limit: number
};

export async function consultarCardapio(unidadeId: string, { page, limit }: Paginacao) {
    const unidade = await prisma.unidade.findUnique({
        where: { id: unidadeId },
        select: { ativa: true }
    });

    if (!unidade || !unidade.ativa) throw new NotFoundError("Unidade não encontrada")

    const filtro = {
        unidade_id: unidadeId,
        oferecido: true
    };


    const [total, itensDoCardapio] = await Promise.all([
        prisma.produtoUnidade.count({ where: filtro }),
        prisma.produtoUnidade.findMany({
            where: filtro,
            orderBy: { produto: { nome: "asc" } },
            skip: (page - 1) * limit,
            take: limit,
            include: {
                produto: {
                    include: {
                        itens_receita: { select: { ingrediente_id: true, quantidade: true } },
                    },
                },
            }
        })
    ])
    // Monta a lista de ingredientes usados pelos produtos desta página
    const idsIngredientes = [
        ...new Set(
            itensDoCardapio.flatMap((item) =>
                item.produto.itens_receita.map((itemReceita) => itemReceita.ingrediente_id),
            ),
        ),
    ];
    //Busca o estoque desta unidade só dos ingredientes da lista
    const estoques = await prisma.estoqueIngrediente.findMany({
        where: { unidade_id: unidadeId, ingrediente_id: { in: idsIngredientes } },
        select: { ingrediente_id: true, quantidade: true },
    });


    //Transforma a lista no Map que o disponibilidade.ts
    const estoque = new Map<string, number>(
        estoques.map((e) => [e.ingrediente_id, e.quantidade.toNumber()]),
    );
    const hoje = dataDeHoje();
    const data = itensDoCardapio.map((item) => ({
        id: item.produto.id,
        nome: item.produto.nome,
        preco: (item.preco_unidade ?? item.produto.preco_base).toFixed(2),
        disponivel: produtoDisponivel(
            {
                receita: item.produto.itens_receita.map((itemReceita) => ({
                    ingredienteId: itemReceita.ingrediente_id,
                    quantidade: itemReceita.quantidade.toNumber(),
                })),
                sazonal: item.produto.sazonal,
                sazonalAtivo: item.sazonal_ativo,
                inicioJanela: item.produto.inicio_janela,
                fimJanela: item.produto.fim_janela,
            },
            estoque, hoje,
        ),
    }));

    return { data, page, limit, total };

}
