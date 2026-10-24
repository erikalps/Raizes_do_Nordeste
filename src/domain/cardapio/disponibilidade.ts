export type IngredienteDaReceita = {
  ingredienteId: string;
  quantidade: number;
};

export type ProdutoParaDisponibilidade = {
  receita: IngredienteDaReceita[];
  sazonal: boolean;
  sazonalAtivo: boolean;
  inicioJanela: Date | null;
  fimJanela: Date | null;
};

const dia = (data: Date) => data.toISOString().slice(0, 10);

function dentroDaJanela(produto: ProdutoParaDisponibilidade, hoje: string): boolean {
  if (!produto.inicioJanela || !produto.fimJanela) return false;
  return hoje >= dia(produto.inicioJanela) && hoje <= dia(produto.fimJanela);
}

export function produtoDisponivel(
  produto: ProdutoParaDisponibilidade,
  estoque: Map<string, number>,
  hoje: string,
): boolean {
  if (produto.sazonal && (!produto.sazonalAtivo || !dentroDaJanela(produto, hoje))) {
    return false;
  }

  return produto.receita.every(
    (item) => (estoque.get(item.ingredienteId) ?? 0) >= item.quantidade,
  );
}