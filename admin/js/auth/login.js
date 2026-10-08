/**
 * =========================================================================
 * TRAINING WORK — TELA DE LOGIN (login.js)
 * =========================================================================
 */

import { login, resetarSenha, escutarSessao } from "./auth-service.js";

/* =========================================================================
 * SE O USUÁRIO JÁ ESTIVER LOGADO, REDIRECIONA
 * =========================================================================
 *
 * ⚠️ IMPORTANTE: só redireciona se o usuário já estiver há um tempo logado.
 * Se acabamos de fazer login, o `login.js` redireciona manualmente.
 * =========================================================================
 */

let loginAcabouDeAcontecer = false;

escutarSessao((user) => {
    if (user && !loginAcabouDeAcontecer) {
        // Usuário já estava logado (sessão restaurada)
        window.location.replace("dashboard.html");
    }
});

/* =========================================================================
 * TELA DE LOGIN
 * ========================================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("login-form");
    const inputEmail = document.getElementById("email");
    const inputSenha = document.getElementById("password");
    const btnSubmit = document.getElementById("btn-submit");
    const errorBox = document.getElementById("error-msg");
    const btnEsqueci = document.getElementById("btn-esqueci-senha");

    if (!form) return;

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

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        esconderErro();

        const email = inputEmail.value.trim();
        const senha = inputSenha.value;

        if (!email || !senha) {
            mostrarErro("Preencha e-mail e senha.");
            return;
        }

        // Marca que o login está sendo feito agora.
        // Isso impede que o `escutarSessao` redirecione por conta própria
        // enquanto o processo de login ainda está rodando.
        loginAcabouDeAcontecer = true;

        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = "Verificando credenciais...";

        try {
            await login(email, senha);

            // ✅ Espera o token estar totalmente propagado
            await new Promise((r) => setTimeout(r, 500));

            // Redireciona
            window.location.href = "dashboard.html";
        } catch (erro) {
            console.error("Erro no login:", erro);
            loginAcabouDeAcontecer = false;   // ← permite re-login
            mostrarErro(erro.message || "Erro ao fazer login.");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = textoOriginal;
        }
    });

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