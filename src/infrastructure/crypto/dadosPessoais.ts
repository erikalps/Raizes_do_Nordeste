import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function lerChave(nome:string): Buffer{
    const valor = process.env[nome]

    if(!valor) throw new Error(`Variável ${nome} não definida no .env`);
    return Buffer.from(valor, "hex")
}

export function hashCpf(cpf: string): string {
  const somenteDigitos = cpf.replace(/\D/g, "");
  return createHmac("sha256", lerChave("CPF_HMAC_KEY")).update(somenteDigitos).digest("hex");
}

export function criptografar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", lerChave("ENCRYPTION_KEY"), iv);
  const conteudo = Buffer.concat([cipher.update(texto, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, conteudo].map((parte) => parte.toString("base64")).join(".");
}

export function descriptografar(valor: string): string {
  const partes = valor.split(".");
  if (partes.length !== 3) throw new Error("Valor criptografado inválido.");
  const [iv, tag, conteudo] = partes.map((p) => Buffer.from(p, "base64")) as [Buffer, Buffer, Buffer];
  const decipher = createDecipheriv("aes-256-gcm", lerChave("ENCRYPTION_KEY"), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(conteudo), decipher.final()]).toString("utf8");
}