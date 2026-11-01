# Raízes do Nordeste

API de pedidos multicanal com estoque por unidade e pagamento simulado. Estudo de caso acadêmico Raízes do Nordeste, trilha de Back-end.

O fluxo implementado é o de pedido (Fluxo A do roteiro): o cliente escolhe a unidade, consulta o cardápio e faz o pedido pelo app, pelo totem ou no balcão; o pagamento simulado aprova ou recusa; a cozinha prepara e o balcão entrega. Todos os canais usam a mesma API e as mesmas regras.

- **Repositório:** https://github.com/SEU_USUARIO/Raizes_do_Nordeste
- **Swagger (com a API rodando):** http://localhost:3000/docs
- **Coleção do Postman:** [`postman/raizes-do-nordeste.postman_collection.json`](postman/raizes-do-nordeste.postman_collection.json)
- **Especificação OpenAPI:** [`docs/openapi.yaml`](docs/openapi.yaml)

## Tecnologias

- Node.js com TypeScript
- Express 5
- MySQL 8 (motor InnoDB)
- Prisma 7 (ORM e migrations)
- Zod (validação), JWT (autenticação), bcrypt (hash dos códigos de acesso)
- Swagger UI (documentação) e Postman/Newman (testes)

## Requisitos

- **Node.js** 22 ou superior (desenvolvido com a versão VERSAO_NODE)
- **npm** (vem com o Node.js)
- **MySQL** 8.0.16 ou superior. Versões anteriores ignoram as restrições `CHECK` usadas no banco.
- **Postman** (opcional, para rodar os testes pela interface)

## Como executar

### 1. Clonar e instalar as dependências

```bash
git clone https://github.com/SEU_USUARIO/Raizes_do_Nordeste.git
cd Raizes_do_Nordeste
npm install
```

### 2. Criar o banco de dados

No MySQL:

```sql
CREATE DATABASE raizes_do_nordeste;
```

### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

Preencha o `.env`:

| Variável | O que é |
| --- | --- |
| `DATABASE_URL` | Conexão usada pelas migrations: `mysql://USUARIO:SENHA@localhost:3306/raizes_do_nordeste` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Os mesmos dados de conexão, usados pela API |
| `JWT_SECRET` | Chave que assina os tokens de login |
| `CPF_HMAC_KEY` | Chave do hash do CPF, usado na busca do cliente |
| `ENCRYPTION_KEY` | Chave da criptografia dos dados pessoais (AES-256-GCM) |
| `PORT` | Porta da API (padrão 3000) |

As três chaves precisam ter 64 caracteres hexadecimais. Para gerar cada uma:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Criar as tabelas, gerar o cliente do banco e carregar os dados de exemplo

```bash
npx prisma migrate deploy
npx prisma generate
npx prisma db seed
```

- `migrate deploy` cria as tabelas a partir das migrations em `prisma/migrations`, incluindo as restrições `CHECK` (estoque, quantidade e saldo de pontos nunca negativos).
- `generate` cria o código de acesso ao banco em `src/generated`, que não fica no repositório.
- `db seed` apaga os dados e recria os dados de exemplo. Pode ser rodado quantas vezes for preciso.

### 5. Iniciar a API

Em desenvolvimento (reinicia ao salvar os arquivos):

```bash
npm run dev
```

Ou com a versão compilada:

```bash
npm run build
npm start
```

A API sobe em `http://localhost:3000`. Para conferir: `http://localhost:3000/health` deve responder `{"status":"ok"}`.

## Documentação da API (Swagger)

Com a API rodando, acesse **http://localhost:3000/docs**.

A página lista os 15 endpoints, com exemplos de requisição e resposta, os códigos de status e o padrão de erro. Para testar os endpoints protegidos:

1. Em `POST /auth/login`, use **Try it out** e **Execute** (o exemplo já vem com o login da gerente).
2. Copie o `accessToken` da resposta.
3. Clique em **Authorize**, cole o token e confirme.

O arquivo [`docs/openapi.yaml`](docs/openapi.yaml) também pode ser aberto sem rodar a API, colando o conteúdo em https://editor.swagger.io.

## Dados de exemplo (seed)

**Unidade:** Boa Viagem, Recife (`10000000-0000-4000-8000-000000000001`), aberta das 00:00 às 23:59.

**Funcionários** (login com o id e o código de 4 dígitos):

| Nome | Perfil | Id | Código |
| --- | --- | --- | --- |
| Ana Gerente | GERENTE | `20000000-0000-4000-8000-000000000002` | 1111 |
| Bruno Atendente | ATENDENTE | `20000000-0000-4000-8000-000000000003` | 2222 |
| Carla Cozinheira | COZINHEIRO | `20000000-0000-4000-8000-000000000004` | 3333 |
| Admin da Rede | ADMINISTRADOR | `20000000-0000-4000-8000-000000000001` | 9999 |

**Cliente cadastrado:** CPF `52998224725` (gera pontos ao ser informado no pedido).

**Estoque preparado para os testes:** a carne de sol dá para uma tapioca, mas não para duas (estoque insuficiente), e o ovo está zerado (cuscuz com ovo indisponível).

## Testes

Os testes estão na coleção do Postman: 29 cenários (17 positivos e 12 negativos), organizados em 6 pastas, com verificações automáticas em cada requisição. Os tokens e os ids dos pedidos passam de uma requisição para a outra por variáveis da coleção.

**Antes de rodar:** com a API no ar, aplique o seed para partir sempre dos mesmos dados:

```bash
npx prisma db seed
```

**Pelo terminal** (com o Newman):

```bash
npx newman run postman/raizes-do-nordeste.postman_collection.json
```

**Pelo Postman:** Import → escolha o arquivo da coleção → nos três pontinhos da coleção, **Run collection** → **Run**.

A coleção precisa rodar inteira e na ordem, porque cada pasta usa os dados criados pelas anteriores:

1. **Auth:** logins e acesso sem token
2. **Unidades e cardápio**
3. **Pedidos:** criação e erros de validação, estoque e permissão
4. **Pagamento:** aprovado, repetido e recusado
5. **Cozinha e balcão:** fila, preparo, pronto e retirada
6. **Consulta e cancelamento:** filtros, acompanhamento e cancelamento

O plano de testes completo, com pré-condição, entrada e saída esperada de cada cenário, está no documento do projeto.

## Endpoints

| Método | Endpoint | Acesso | Descrição |
| --- | --- | --- | --- |
| GET | `/health` | Público | Verifica se a API está no ar |
| POST | `/auth/login` | Público | Login de funcionário |
| GET | `/auth/me` | Token | Dados do funcionário logado |
| GET | `/unidades` | Público | Unidades ativas |
| GET | `/unidades/{id}/funcionarios` | Público | Funcionários da unidade, para a tela de login |
| GET | `/unidades/{id}/produtos` | Público | Cardápio com preço e disponibilidade |
| POST | `/pedidos` | Público (balcão: atendente ou gerente) | Cria o pedido e reserva os ingredientes |
| GET | `/pedidos` | Gerente, atendente, matriz | Lista com filtros `canalPedido`, `status` e `unidadeId` |
| GET | `/pedidos/{id}` | Público (funcionário: só a própria unidade) | Acompanhamento do pedido |
| POST | `/pedidos/{id}/cancelamento` | Público (ou atendente e gerente) | Cancela antes do preparo |
| POST | `/pagamentos/{id}/resultado` | Serviço de pagamento simulado | Aprova ou recusa a tentativa |
| GET | `/cozinha/fila` | Cozinheiro, gerente | Fila da cozinha |
| POST | `/pedidos/{id}/preparo` | Cozinheiro | Inicia o preparo e confirma os pontos |
| POST | `/pedidos/{id}/pronto` | Cozinheiro | Marca como pronto |
| POST | `/pedidos/{id}/retirada` | Atendente, gerente | Registra a entrega |

Toda listagem é paginada com `page` e `limit` (máximo 50). Todo erro segue o mesmo formato:

```json
{
  "error": "DADOS_INVALIDOS",
  "message": "Um ou mais campos são inválidos.",
  "details": [{ "field": "canalPedido", "issue": "Campo obrigatório: APP, TOTEM ou BALCAO." }],
  "timestamp": "2026-10-26T15:00:00.000Z",
  "path": "/pedidos"
}
```

## Estrutura do projeto

```
docs/openapi.yaml           Especificação da API (Swagger)
postman/                    Coleção de testes
prisma/
├── schema.prisma           Modelo do banco
├── migrations/             Migrations, incluindo as restrições CHECK
└── seed.ts                 Dados de exemplo
src/
├── domain/                 Regras de negócio puras, sem banco nem HTTP
├── application/            Casos de uso (criar pedido, pagamento, status, cancelamento, consultas)
├── infrastructure/         Banco (Prisma), JWT e criptografia
├── api/                    Rotas, controllers, middlewares e validação
├── app.ts                  Montagem do Express
└── server.ts               Inicialização
```

## Decisões e limitações

- **Transações:** a criação do pedido reserva os ingredientes com uma atualização condicional por ingrediente, dentro de uma transação. Se faltar qualquer um, nada é gravado. O mesmo vale para o pagamento, as mudanças de status e o cancelamento.
- **Pagamento simulado:** a rota `POST /pagamentos/{id}/resultado` é pública para permitir os testes. Em um sistema real, o serviço de pagamento assinaria a chamada.
- **Cliente sem login:** o cancelamento e o acompanhamento sem token dependem do id do pedido, um UUID aleatório entregue só a quem criou o pedido. Um sistema real exigiria uma prova de que o pedido é daquele aparelho.
- **Dados pessoais:** CPF, e-mail, celular e data de nascimento são criptografados; o CPF também é guardado como hash HMAC, usado na busca. Nenhuma resposta da API devolve dados pessoais.
- **Fora da implementação** (só documentados): cadastro de cliente, resgate de pontos, campanhas e gestão de cardápio e estoque pelo gerente.