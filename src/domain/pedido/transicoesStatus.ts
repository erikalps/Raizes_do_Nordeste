export type StatusPedido =
 |"AGUARDANDO_PAGAMENTO"
 |"PAGO"
 |"EM_PREPARO"
 |"PRONTO"
 |"RETIRADO"
 |"CANCELADO"
 |"NAO_RETIRADO";

const TRANSICOES: Record<StatusPedido, StatusPedido[]> = {
  AGUARDANDO_PAGAMENTO: ["PAGO", "CANCELADO"],
  PAGO: ["EM_PREPARO", "CANCELADO"],
  EM_PREPARO: ["PRONTO"],
  PRONTO: ["RETIRADO", "NAO_RETIRADO"],
  RETIRADO: [],
  CANCELADO: [],
  NAO_RETIRADO: [],
};

export function podeMudarStatus(atual: StatusPedido, novo: StatusPedido): boolean {
  return TRANSICOES[atual].includes(novo);
}