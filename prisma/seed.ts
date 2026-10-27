import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/infrastructure/database/prisma.js";
import { criptografar, hashCpf } from "../src/infrastructure/crypto/dadosPessoais.js";


const ID = {
  unidade: "10000000-0000-4000-8000-000000000001",

  admin: "20000000-0000-4000-8000-000000000001",
  gerente: "20000000-0000-4000-8000-000000000002",
  atendente: "20000000-0000-4000-8000-000000000003",
  cozinheiro: "20000000-0000-4000-8000-000000000004",

  goma: "30000000-0000-4000-8000-000000000001",
  carneDeSol: "30000000-0000-4000-8000-000000000002",
  queijoCoalho: "30000000-0000-4000-8000-000000000003",
  flocao: "30000000-0000-4000-8000-000000000004",
  manteiga: "30000000-0000-4000-8000-000000000005",
  ovo: "30000000-0000-4000-8000-000000000006",

  tapiocaCarne: "40000000-0000-4000-8000-000000000001",
  tapiocaQueijo: "40000000-0000-4000-8000-000000000002",
  cuscuzQueijo: "40000000-0000-4000-8000-000000000003",
  cuscuzOvo: "40000000-0000-4000-8000-000000000004",

  cliente: "50000000-0000-4000-8000-000000000001",
} as const;

const hora = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

async function limpar() {
  await prisma.movimentacaoEstoque.deleteMany();
  await prisma.registroAuditoria.deleteMany();
  await prisma.pagamento.deleteMany();
  await prisma.itemPedido.deleteMany();
  await prisma.pedido.deleteMany();
  await prisma.estoqueIngrediente.deleteMany();
  await prisma.itemReceita.deleteMany();
  await prisma.produtoUnidade.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.ingrediente.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.funcionario.deleteMany();
  await prisma.unidade.deleteMany();
  await prisma.configuracaoFidelidade.deleteMany();
}

async function main() {
  await limpar();

  await prisma.configuracaoFidelidade.create({
    data: { pontos_por_real: 1, valor_ponto: 0.05, politica_estorno: "REMOVER_PONTOS" },
  });

  await prisma.unidade.create({
    data: {
      id: ID.unidade,
      cidade: "Recife",
      bairro: "Boa Viagem",
      regiao: "Nordeste",
      horario_abertura: hora("08:00"),
      horario_fechamento: hora("23:59"),
      ativa: true,
      responsavel_metas: "GERENTE",
    },
  });

  const funcionarios = [
    { id: ID.admin, unidade_id: null, nome: "Admin da Rede", papel: "ADMINISTRADOR", codigo: "9999" },
    { id: ID.gerente, unidade_id: ID.unidade, nome: "Ana Gerente", papel: "GERENTE", codigo: "1111" },
    { id: ID.atendente, unidade_id: ID.unidade, nome: "Bruno Atendente", papel: "ATENDENTE", codigo: "2222" },
    { id: ID.cozinheiro, unidade_id: ID.unidade, nome: "Carla Cozinheira", papel: "COZINHEIRO", codigo: "3333" },
  ] as const;

  for (const f of funcionarios) {
    await prisma.funcionario.create({
      data: {
        id: f.id,
        unidade_id: f.unidade_id,
        nome: f.nome,
        papel: f.papel,
        codigo_hash: await bcrypt.hash(f.codigo, 10),
      },
    });
  }

  await prisma.ingrediente.createMany({
    data: [
      { id: ID.goma, nome: "Goma de tapioca", unidade_medida: "kg" },
      { id: ID.carneDeSol, nome: "Carne de sol", unidade_medida: "kg" },
      { id: ID.queijoCoalho, nome: "Queijo coalho", unidade_medida: "kg" },
      { id: ID.flocao, nome: "Flocão de milho", unidade_medida: "kg" },
      { id: ID.manteiga, nome: "Manteiga de garrafa", unidade_medida: "l" },
      { id: ID.ovo, nome: "Ovo", unidade_medida: "un" },
    ],
  });

  await prisma.estoqueIngrediente.createMany({
    data: [
      { unidade_id: ID.unidade, ingrediente_id: ID.goma, quantidade: 5, quantidade_minima: 1 },
      // estoque baixo: dá para 1 tapioca de carne, mas não para 2 (teste do 409)
      { unidade_id: ID.unidade, ingrediente_id: ID.carneDeSol, quantidade: 0.1, quantidade_minima: 0.5 },
      { unidade_id: ID.unidade, ingrediente_id: ID.queijoCoalho, quantidade: 3, quantidade_minima: 0.5 },
      { unidade_id: ID.unidade, ingrediente_id: ID.flocao, quantidade: 4, quantidade_minima: 1 },
      { unidade_id: ID.unidade, ingrediente_id: ID.manteiga, quantidade: 1, quantidade_minima: 0.2 },
      // estoque zerado: o cuscuz com ovo aparece indisponível no cardápio
      { unidade_id: ID.unidade, ingrediente_id: ID.ovo, quantidade: 0, quantidade_minima: 12 },
    ],
  });

  await prisma.produto.createMany({
    data: [
      { id: ID.tapiocaCarne, nome: "Tapioca de carne de sol", preco_base: 18 },
      { id: ID.tapiocaQueijo, nome: "Tapioca de queijo coalho", preco_base: 14 },
      { id: ID.cuscuzQueijo, nome: "Cuscuz com queijo coalho", preco_base: 12 },
      { id: ID.cuscuzOvo, nome: "Cuscuz com ovo", preco_base: 13 },
    ],
  });

  await prisma.produtoUnidade.createMany({
    data: [ID.tapiocaCarne, ID.tapiocaQueijo, ID.cuscuzQueijo, ID.cuscuzOvo].map((produto_id) => ({
      produto_id,
      unidade_id: ID.unidade,
    })),
  });

  await prisma.itemReceita.createMany({
    data: [
      { produto_id: ID.tapiocaCarne, ingrediente_id: ID.goma, quantidade: 0.1 },
      { produto_id: ID.tapiocaCarne, ingrediente_id: ID.carneDeSol, quantidade: 0.08 },
      { produto_id: ID.tapiocaCarne, ingrediente_id: ID.queijoCoalho, quantidade: 0.03 },

      { produto_id: ID.tapiocaQueijo, ingrediente_id: ID.goma, quantidade: 0.1 },
      { produto_id: ID.tapiocaQueijo, ingrediente_id: ID.queijoCoalho, quantidade: 0.05 },
      { produto_id: ID.tapiocaQueijo, ingrediente_id: ID.manteiga, quantidade: 0.01 },

      { produto_id: ID.cuscuzQueijo, ingrediente_id: ID.flocao, quantidade: 0.15 },
      { produto_id: ID.cuscuzQueijo, ingrediente_id: ID.queijoCoalho, quantidade: 0.05 },
      { produto_id: ID.cuscuzQueijo, ingrediente_id: ID.manteiga, quantidade: 0.01 },

      { produto_id: ID.cuscuzOvo, ingrediente_id: ID.flocao, quantidade: 0.15 },
      { produto_id: ID.cuscuzOvo, ingrediente_id: ID.ovo, quantidade: 2 },
    ],
  });

  const cpf = "52998224725";
  await prisma.cliente.create({
    data: {
      id: ID.cliente,
      cpf: criptografar(cpf),
      cpf_hash: hashCpf(cpf),
      email: criptografar("cliente@exemplo.com"),
      celular: criptografar("81999990000"),
    },
  });

  console.log("Seed concluído.");
  console.log("Logins (funcionário + código): Ana 1111, Bruno 2222, Carla 3333, Admin 9999");
  console.log(`CPF do cliente de teste: ${cpf}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (erro) => {
    console.error(erro);
    await prisma.$disconnect();
    process.exit(1);
  });