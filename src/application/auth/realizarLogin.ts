import bcrypt from "bcryptjs";
import { prisma } from "../../infrastructure/database/prisma.js";
import { gerarToken } from "../../infrastructure/auth/jwt.js";
import { AcessoBloqueadoError, UnauthorizedError } from "../../domain/errors/AppError.js";

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MINUTOS = 15;
const DURACAO_TOKEN_SEGUNDOS = 8 * 60 * 60;

const credenciaisInvalidas = () =>
  new UnauthorizedError("Funcionário ou código inválido.", "CREDENCIAIS_INVALIDAS");

export async function realizarLogin(funcionarioId: string, codigo: string) {
  const funcionario = await prisma.funcionario.findUnique({ where: { id: funcionarioId } });
  if (!funcionario || !funcionario.ativo || !funcionario.codigo_hash) {
    throw credenciaisInvalidas();
  }

  if (funcionario.bloqueado_ate && funcionario.bloqueado_ate > new Date()) {
    throw new AcessoBloqueadoError("Acesso bloqueado por excesso de tentativas. Tente novamente mais tarde.");
  }

  const codigoCorreto = await bcrypt.compare(codigo, funcionario.codigo_hash);

  if (!codigoCorreto) {
    const atualizado = await prisma.funcionario.update({
      where: { id: funcionario.id },
      data: { tentativas_erradas: { increment: 1 } },
    });
    if (atualizado.tentativas_erradas >= MAX_TENTATIVAS) {
      await prisma.funcionario.update({
        where: { id: funcionario.id },
        data: {
          tentativas_erradas: 0,
          bloqueado_ate: new Date(Date.now() + BLOQUEIO_MINUTOS * 60 * 1000),
        },
      });
    }
    throw credenciaisInvalidas();
  }

  await prisma.funcionario.update({
    where: { id: funcionario.id },
    data: { tentativas_erradas: 0, bloqueado_ate: null },
  });

  const dados = {
    id: funcionario.id,
    papel: funcionario.papel,
    unidadeId: funcionario.unidade_id,
  };

  return {
    accessToken: gerarToken(dados),
    tokenType: "Bearer",
    expiresIn: DURACAO_TOKEN_SEGUNDOS,
    funcionario: { ...dados, nome: funcionario.nome },
  };
}