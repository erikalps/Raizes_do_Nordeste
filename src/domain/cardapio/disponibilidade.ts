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

type DadosSazonais = Omit<ProdutoParaDisponibilidade, "receita">;

const dia = (data: Date) => data.toISOString().slice(0, 10);

function dentroDaJanela(produto: DadosSazonais, hoje: string): boolean {
  if (!produto.inicioJanela || !produto.fimJanela) return false;
  return hoje >= dia(produto.inicioJanela) && hoje <= dia(produto.fimJanela);
}

export function vendaSazonalLiberada(produto: DadosSazonais, hoje: string): boolean {
  return !produto.sazonal || (produto.sazonalAtivo && dentroDaJanela(produto, hoje));
}

export function produtoDisponivel(
  produto: ProdutoParaDisponibilidade,
  estoque: Map<string, number>,
  hoje: string,
): boolean {
  if (!vendaSazonalLiberada(produto, hoje)) return false;

  return produto.receita.every(
    (item) => (estoque.get(item.ingredienteId) ?? 0) >= item.quantidade,
  );
}