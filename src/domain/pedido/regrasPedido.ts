import type { IngredienteDaReceita } from "../cardapio/disponibilidade.js";

export type CanalPedido = "APP" | "TOTEM" | "BALCAO";
export type FormaPagamento = "CARTAO" | "PIX" | "DINHEIRO";
export type ItemSolicitado = { produtoId: string; quantidade: number };

const PRAZO_PAGAMENTO_MINUTOS: Record<CanalPedido, number> = {
    APP: 10,
    TOTEM: 5,
    BALCAO: 5,
}

const arredondar3 = (valor: number) => Math.round(valor * 1000) / 1000;

export function somarIngredientes(
    itens: ItemSolicitado[],
    receitas: Map<string, IngredienteDaReceita[]>,
): Map<string, number> {
    const total = new Map<string, number>();
    for (const item of itens) {
        for (const ingrediente of receitas.get(item.produtoId) ?? []) {
            const atual = total.get(ingrediente.ingredienteId) ?? 0;
            total.set(
                ingrediente.ingredienteId,
                arredondar3(atual + ingrediente.quantidade * item.quantidade),
            );
        }
    }
    return total;
}

export function calcularPontos(valorPago: number, pontosPorReal: number): number {
    return Math.floor(Number((valorPago * pontosPorReal).toFixed(6)));
}

export function exigeHorarioDeFuncionamento(canal: CanalPedido): boolean {
    return canal !== "BALCAO";
}

const minutosDoDia = (horario: Date) => horario.getUTCHours() * 60 + horario.getUTCMinutes();

export function dentroDoHorario(abertura: Date, fechamento: Date, agoraEmMinutos: number): boolean {
    const inicio = minutosDoDia(abertura);
    const fim = minutosDoDia(fechamento);
    if (inicio <= fim) return agoraEmMinutos >= inicio && agoraEmMinutos < fim;
    return agoraEmMinutos >= inicio || agoraEmMinutos < fim;
}

export function formaPagamentoPermitida(canal: CanalPedido, forma: FormaPagamento): boolean {
    return forma !== "DINHEIRO" || canal === "BALCAO";
}

export function prazoDoPagamento(canal: CanalPedido, agora: Date): Date {
    return new Date(agora.getTime() + PRAZO_PAGAMENTO_MINUTOS[canal] * 60 * 1000);
}

const PAPEIS_DO_BALCAO = ["ATENDENTE", "GERENTE"];

export function podeAtenderNoBalcao(papel: string): boolean {
    return PAPEIS_DO_BALCAO.includes(papel);
}
