/**
 * =========================================================================
 * TRAINING WORK — TELA DE LOGIN (login.js)
 * =========================================================================
 *
 * Este arquivo cuida APENAS da tela de login.
 * Toda a "inteligência" de autenticação está em auth-service.js.
 *
 * IDs esperados no HTML:
 *   - #login-form          → o <form>
 *   - #email               → input de e-mail
 *   - #password            → input de senha
 *   - #btn-submit          → botão de entrar
 *   - #error-msg           → div onde mostramos erros
 *   - #btn-esqueci-senha   → link "Esqueci minha senha" (opcional)
 * =========================================================================
 */

import { login, resetarSenha, escutarSessao } from "./auth-service.js";

/* =========================================================================
 * SE O USUÁRIO JÁ ESTIVER LOGADO, REDIRECIONA
 * =========================================================================
 *
 * Se um admin já logado abrir login.html, mandamos ele direto pro dashboard.
 * Assim, ele não precisa fazer login duas vezes.
 * ========================================================================= */

escutarSessao((user) => {
    if (user) {
        window.location.replace("dashboard.html");
    }
});

/* =========================================================================
 * TELA DE LOGIN
 * ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
    // --- Pega os elementos do HTML por ID ---
    const form = document.getElementById("login-form");
    const inputEmail = document.getElementById("email");
    const inputSenha = document.getElementById("password");
    const btnSubmit = document.getElementById("btn-submit");
    const errorBox = document.getElementById("error-msg");
    const btnEsqueci = document.getElementById("btn-esqueci-senha");

    // Se a página atual não tem o formulário, saímos silenciosamente.
    if (!form) return;

    /* -------------------------------------------------------------------
     * HELPERS
     * ------------------------------------------------------------------- */
    function mostrarErro(mensagem) {
        if (!errorBox) return;
        errorBox.textContent = mensagem.replace("Firebase: ", "");
        errorBox.style.display = "block";
    }

    function esconderErro() {
        if (!errorBox) return;
        errorBox.textContent = "";
        errorBox.style.display = "none";
    }

    /* -------------------------------------------------------------------
     * AÇÃO: BOTÃO DE ENTRAR
     * -------------------------------------------------------------------
     * Um único listener de submit. Faz login, mostra erros e redireciona.
     * ========================================================================= */
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        esconderErro();

        const email = inputEmail.value.trim();
        const senha = inputSenha.value;

        // Validação rápida no lado do cliente
        if (!email || !senha) {
            mostrarErro("Preencha e-mail e senha.");
            return;
        }

        // Estado de "carregando" — desabilita botão e muda o texto.
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "Verificando credenciais...";

        try {
            await login(email, senha);
            window.location.href = "dashboard.html";
        } catch (erro) {
            console.error("Erro no login:", erro);
            mostrarErro(erro.message || "Erro ao fazer login.");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    });

    /* -------------------------------------------------------------------
     * AÇÃO: ESQUECI MINHA SENHA
     * ------------------------------------------------------------------- */
    if (btnEsqueci) {
        btnEsqueci.addEventListener("click", async (e) => {
            e.preventDefault();
            esconderErro();

            const email = inputEmail.value.trim();
            if (!email) {
                mostrarErro("Digite seu e-mail para receber o link de redefinição.");
                return;
            }

            try {
                await resetarSenha(email);
                alert("Se este e-mail estiver cadastrado, você receberá um link de redefinição em alguns minutos.");
            } catch (erro) {
                console.error("Erro ao enviar reset:", erro);
                mostrarErro("Não foi possível enviar o e-mail de redefinição.");
            }
        });
    }
});