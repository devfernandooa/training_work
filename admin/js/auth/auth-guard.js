/**
 * =========================================================================
 * TRAINING WORK — GUARDA DE AUTENTICAÇÃO (auth-guard.js)
 * =========================================================================
 *
 * Este arquivo é o "porteiro" das páginas administrativas.
 *
 * Ele faz 3 coisas:
 *   1. Verifica se o usuário está logado. Se não → redireciona pra login.
 *   2. Busca o documento do admin e valida se está `ativo: true`.
 *   3. (Futuro) Verifica se o papel dele permite acessar essa página.
 *
 * COMO USAR — em qualquer página HTML do admin:
 *
 *   <script type="module">
 *       import { checkAuth } from "./js/auth/auth-guard.js";
 *
 *       checkAuth((user, adminData) => {
 *           // Aqui você já tem certeza de que o usuário está logado
 *           // e é um admin ativo. Pode carregar os dados da página.
 *           console.log("Bem-vindo,", adminData.nome);
 *       });
 *   </script>
 *
 * Se o usuário NÃO estiver logado, ele é redirecionado automaticamente
 * para login.html antes mesmo do callback rodar.
 * =========================================================================
 */

import { escutarSessao, obterAdminLogado, logout } from "./auth-service.js";

/* =========================================================================
 * VERIFICAÇÃO PRINCIPAL
 * ========================================================================= */

/**
 * Verifica a autenticação ao carregar a página.
 *
 * @param {Function} callbackOnSuccess — chamado com (user, adminData)
 *        quando o usuário está logado E é um admin ativo.
 */
export function checkAuth(callbackOnSuccess) {
    // escutarSessao fica ouvindo o Firebase Auth.
    // O Firebase chama esse callback quando:
    //   - A página termina de carregar;
    //   - O usuário loga;
    //   - O usuário desloga.
    escutarSessao(async (user) => {

        // ---------- Caso 1: usuário NÃO está logado ----------
        if (!user) {
            // replace() troca a URL atual no histórico, então o usuário
            // não consegue "voltar" para a página protegida.
            window.location.replace("login.html");
            return;
        }

        // ---------- Caso 2: usuário está logado. Vamos validar. ----------
        try {
            // Busca o documento /administradores/{uid}.
            const adminData = await obterAdminLogado(user);

            // Se o doc não existe, esse usuário do Auth não é admin.
            if (!adminData) {
                await logout();
                window.location.replace("login.html");
                return;
            }

            // Se o admin foi desativado, também barramos.
            if (adminData.ativo !== true) {
                await logout();
                window.location.replace("login.html");
                return;
            }

            // ---------- Tudo OK. Chama o callback da página. ----------
            if (typeof callbackOnSuccess === "function") {
                callbackOnSuccess(user, adminData);
            }

        } catch (erro) {
            // Se der qualquer erro inesperado (falha de rede, permissão),
            // é mais seguro deslogar e mandar pro login do que deixar
            // a página meio-carregada.
            console.error("Erro ao verificar autenticação:", erro);
            await logout();
            window.location.replace("login.html");
        }
    });
}

/* =========================================================================
 * LOGOUT (re-exportado para conveniência)
 * ========================================================================= */

/**
 * Atalho para o botão de logout da sidebar.
 * Re-exporta a função do auth-service para quem importa apenas o guard.
 */
export { logout };