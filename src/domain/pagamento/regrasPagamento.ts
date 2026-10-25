export type ResultadoPagamento = "APROVADO" | "RECUSADO";

export type MotivoRecusa = "SALDO_INSUFICIENTE"
    | "SALDO_INSUFICIENTE"
    | "SUSPEITA_FRAUDE"
    | "CARTAO_EXPIRADO"
    | "DADOS_INVALIDOS"
    | "ERRO_PROCESSAMENTO";



export const MOTIVOS_RECUSA: MotivoRecusa[] = [
    "SALDO_INSUFICIENTE",
    "SUSPEITA_FRAUDE",
    "CARTAO_EXPIRADO",
    "DADOS_INVALIDOS",
    "ERRO_PROCESSAMENTO",
];

type CategoriaRecusa = "NAO_AUTORIZADO" | "DADOS" | "PROCESSAMENTO";

const CATEGORIA_DO_MOTIVO: Record<MotivoRecusa, CategoriaRecusa> = {
    SALDO_INSUFICIENTE: "NAO_AUTORIZADO",
    SUSPEITA_FRAUDE: "NAO_AUTORIZADO",
    CARTAO_EXPIRADO: "DADOS",
    DADOS_INVALIDOS: "DADOS",
    ERRO_PROCESSAMENTO: "PROCESSAMENTO",
};

const MENSAGEM_DA_CATEGORIA: Record<CategoriaRecusa, string> = {
    NAO_AUTORIZADO: "Pagamento não autorizado. Faça um novo pedido usando outro método de pagamento.",
    DADOS: "Não foi possível validar os dados de pagamento. Confira os dados ou use outro método.",
    PROCESSAMENTO: "Não foi possível concluir o pagamento. Tente novamente em instantes.",
};

export const MENSAGEM_SEM_RESPOSTA =
    "Não foi possível confirmar o pagamento. Se houver alguma cobrança, ela será estornada.";

export function mensagemDeRecusa(motivo: MotivoRecusa): string {
    return MENSAGEM_DA_CATEGORIA[CATEGORIA_DO_MOTIVO[motivo]];
}

export function pagamentoVencido(expiraEm: Date, agora: Date): boolean {
    return agora.getTime() > expiraEm.getTime();
}

export function gerarNumeroRetirada(pedidoId: string): string {
    return pedidoId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

