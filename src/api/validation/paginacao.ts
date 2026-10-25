import { z } from "zod";

export const paginacaoSchema = z.object({
  page: z.coerce
    .number({ error: "Deve ser um número." })
    .int({ error: "Deve ser um número inteiro." })
    .min(1, { error: "Deve ser 1 ou mais." })
    .default(1),
  limit: z.coerce
    .number({ error: "Deve ser um número." })
    .int({ error: "Deve ser um número inteiro." })
    .min(1, { error: "Deve ser 1 ou mais." })
    .max(50, { error: "Deve ser no máximo 50." })
    .default(10),
});