-- CreateTable
CREATE TABLE `unidade` (
    `id` CHAR(36) NOT NULL,
    `cidade` VARCHAR(100) NOT NULL,
    `bairro` VARCHAR(100) NOT NULL,
    `regiao` VARCHAR(50) NOT NULL,
    `horario_abertura` TIME(0) NOT NULL,
    `horario_fechamento` TIME(0) NOT NULL,
    `ativa` BOOLEAN NOT NULL DEFAULT false,
    `responsavel_metas` ENUM('ADMINISTRADOR', 'GERENTE', 'AMBOS') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `funcionario` (
    `id` CHAR(36) NOT NULL,
    `unidade_id` CHAR(36) NULL,
    `nome` VARCHAR(100) NOT NULL,
    `papel` ENUM('ATENDENTE', 'COZINHEIRO', 'GERENTE', 'ADMINISTRADOR', 'CONSULTOR') NOT NULL,
    `codigo_hash` VARCHAR(60) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `tentativas_erradas` INTEGER NOT NULL DEFAULT 0,
    `bloqueado_ate` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produto` (
    `id` CHAR(36) NOT NULL,
    `nome` VARCHAR(100) NOT NULL,
    `preco_base` DECIMAL(10, 2) NOT NULL,
    `travado` BOOLEAN NOT NULL DEFAULT false,
    `permite_alterar_ingredientes` BOOLEAN NOT NULL DEFAULT false,
    `permite_alterar_preco` BOOLEAN NOT NULL DEFAULT false,
    `faixa_preco_percentual` DECIMAL(5, 2) NULL,
    `sazonal` BOOLEAN NOT NULL DEFAULT false,
    `inicio_janela` DATE NULL,
    `fim_janela` DATE NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `produto_unidade` (
    `id` CHAR(36) NOT NULL,
    `produto_id` CHAR(36) NOT NULL,
    `unidade_id` CHAR(36) NOT NULL,
    `oferecido` BOOLEAN NOT NULL DEFAULT true,
    `preco_unidade` DECIMAL(10, 2) NULL,
    `sazonal_ativo` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `produto_unidade_produto_id_unidade_id_key`(`produto_id`, `unidade_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingrediente` (
    `id` CHAR(36) NOT NULL,
    `unidade_id` CHAR(36) NULL,
    `nome` VARCHAR(100) NOT NULL,
    `unidade_medida` VARCHAR(20) NOT NULL,
    `regional` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_receita` (
    `id` CHAR(36) NOT NULL,
    `produto_id` CHAR(36) NOT NULL,
    `ingrediente_id` CHAR(36) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `trocavel` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `item_receita_produto_id_ingrediente_id_key`(`produto_id`, `ingrediente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `estoque_ingrediente` (
    `id` CHAR(36) NOT NULL,
    `unidade_id` CHAR(36) NOT NULL,
    `ingrediente_id` CHAR(36) NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `quantidade_minima` DECIMAL(10, 3) NOT NULL,

    UNIQUE INDEX `estoque_ingrediente_unidade_id_ingrediente_id_key`(`unidade_id`, `ingrediente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `movimentacao_estoque` (
    `id` CHAR(36) NOT NULL,
    `estoque_ingrediente_id` CHAR(36) NOT NULL,
    `funcionario_id` CHAR(36) NULL,
    `pedido_id` CHAR(36) NULL,
    `tipo` ENUM('ENTRADA', 'PERDA', 'RESERVA', 'DEVOLUCAO') NOT NULL,
    `quantidade` DECIMAL(10, 3) NOT NULL,
    `motivo` VARCHAR(255) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cliente` (
    `id` CHAR(36) NOT NULL,
    `cpf` TEXT NOT NULL,
    `cpf_hash` CHAR(64) NOT NULL,
    `email` TEXT NOT NULL,
    `celular` TEXT NOT NULL,
    `saldo_pontos` INTEGER NOT NULL DEFAULT 0,
    `data_nascimento` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `cliente_cpf_hash_key`(`cpf_hash`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `configuracao_fidelidade` (
    `id` CHAR(36) NOT NULL,
    `pontos_por_real` DECIMAL(10, 2) NOT NULL,
    `valor_ponto` DECIMAL(10, 4) NOT NULL,
    `politica_estorno` ENUM('REMOVER_PONTOS', 'MANTER_PONTOS') NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedido` (
    `id` CHAR(36) NOT NULL,
    `unidade_id` CHAR(36) NOT NULL,
    `cliente_id` CHAR(36) NULL,
    `registrado_por_id` CHAR(36) NULL,
    `preparado_por_id` CHAR(36) NULL,
    `entregue_por_id` CHAR(36) NULL,
    `numero_retirada` VARCHAR(10) NULL,
    `canal_pedido` ENUM('APP', 'TOTEM', 'BALCAO') NOT NULL,
    `status` ENUM('AGUARDANDO_PAGAMENTO', 'PAGO', 'EM_PREPARO', 'PRONTO', 'RETIRADO', 'CANCELADO', 'NAO_RETIRADO') NOT NULL,
    `motivo_cancelamento` ENUM('CLIENTE', 'PAGAMENTO_RECUSADO', 'PAGAMENTO_SEM_RESPOSTA', 'PRAZO_PAGAMENTO_VENCIDO') NULL,
    `valor_bruto` DECIMAL(10, 2) NOT NULL,
    `desconto_nivel` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `desconto_pontos` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `valor_pago` DECIMAL(10, 2) NOT NULL,
    `pontos_ganhos` INTEGER NOT NULL DEFAULT 0,
    `pontos_usados` INTEGER NOT NULL DEFAULT 0,
    `status_pontos` ENUM('PENDENTE', 'CONFIRMADO', 'DESCARTADO') NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pago_em` DATETIME(3) NULL,
    `preparo_iniciado_em` DATETIME(3) NULL,
    `pronto_em` DATETIME(3) NULL,
    `finalizado_em` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `item_pedido` (
    `id` CHAR(36) NOT NULL,
    `pedido_id` CHAR(36) NOT NULL,
    `produto_id` CHAR(36) NOT NULL,
    `quantidade` INTEGER NOT NULL,
    `preco_unitario` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pagamento` (
    `identificador_tentativa` CHAR(36) NOT NULL,
    `pedido_id` CHAR(36) NOT NULL,
    `recebido_por_id` CHAR(36) NULL,
    `forma` ENUM('CARTAO', 'PIX', 'DINHEIRO') NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADO', 'RECUSADO', 'SEM_RESPOSTA', 'CANCELADO', 'ESTORNADO') NOT NULL,
    `valor` DECIMAL(10, 2) NOT NULL,
    `motivo_recusa` VARCHAR(255) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expira_em` DATETIME(3) NOT NULL,
    `respondido_em` DATETIME(3) NULL,

    PRIMARY KEY (`identificador_tentativa`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registro_auditoria` (
    `id` CHAR(36) NOT NULL,
    `executado_por_id` CHAR(36) NULL,
    `autorizado_por_id` CHAR(36) NULL,
    `acao` VARCHAR(50) NOT NULL,
    `entidade` VARCHAR(50) NOT NULL,
    `entidade_id` VARCHAR(36) NOT NULL,
    `motivo` VARCHAR(255) NULL,
    `valor_anterior` TEXT NULL,
    `valor_novo` TEXT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `funcionario` ADD CONSTRAINT `funcionario_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidade`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_unidade` ADD CONSTRAINT `produto_unidade_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `produto_unidade` ADD CONSTRAINT `produto_unidade_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ingrediente` ADD CONSTRAINT `ingrediente_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidade`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_receita` ADD CONSTRAINT `item_receita_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produto`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_receita` ADD CONSTRAINT `item_receita_ingrediente_id_fkey` FOREIGN KEY (`ingrediente_id`) REFERENCES `ingrediente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estoque_ingrediente` ADD CONSTRAINT `estoque_ingrediente_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `estoque_ingrediente` ADD CONSTRAINT `estoque_ingrediente_ingrediente_id_fkey` FOREIGN KEY (`ingrediente_id`) REFERENCES `ingrediente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `movimentacao_estoque_estoque_ingrediente_id_fkey` FOREIGN KEY (`estoque_ingrediente_id`) REFERENCES `estoque_ingrediente`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `movimentacao_estoque_funcionario_id_fkey` FOREIGN KEY (`funcionario_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `movimentacao_estoque` ADD CONSTRAINT `movimentacao_estoque_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedido`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_unidade_id_fkey` FOREIGN KEY (`unidade_id`) REFERENCES `unidade`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_cliente_id_fkey` FOREIGN KEY (`cliente_id`) REFERENCES `cliente`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_registrado_por_id_fkey` FOREIGN KEY (`registrado_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_preparado_por_id_fkey` FOREIGN KEY (`preparado_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido` ADD CONSTRAINT `pedido_entregue_por_id_fkey` FOREIGN KEY (`entregue_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_pedido` ADD CONSTRAINT `item_pedido_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedido`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `item_pedido` ADD CONSTRAINT `item_pedido_produto_id_fkey` FOREIGN KEY (`produto_id`) REFERENCES `produto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamento` ADD CONSTRAINT `pagamento_pedido_id_fkey` FOREIGN KEY (`pedido_id`) REFERENCES `pedido`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pagamento` ADD CONSTRAINT `pagamento_recebido_por_id_fkey` FOREIGN KEY (`recebido_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_auditoria` ADD CONSTRAINT `registro_auditoria_executado_por_id_fkey` FOREIGN KEY (`executado_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `registro_auditoria` ADD CONSTRAINT `registro_auditoria_autorizado_por_id_fkey` FOREIGN KEY (`autorizado_por_id`) REFERENCES `funcionario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `estoque_ingrediente`
  ADD CONSTRAINT `chk_estoque_quantidade` CHECK (`quantidade` >= 0);

ALTER TABLE `item_pedido`
  ADD CONSTRAINT `chk_item_pedido_quantidade` CHECK (`quantidade` > 0);

ALTER TABLE `cliente`
  ADD CONSTRAINT `chk_cliente_saldo_pontos` CHECK (`saldo_pontos` >= 0);