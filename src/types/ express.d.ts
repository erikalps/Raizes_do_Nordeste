// acrescenta funcionario à lista do que pode existir em req, para o TypeScript aceitar 
// quando o autenticar guardar o funcionário logado ali.

import type { FuncionarioAutenticado } from "../infrastructure/auth/jwt.js";

declare global {
    namespace Express {
        interface Request {
            funcionario?: FuncionarioAutenticado;
        }
    }
}

export { };