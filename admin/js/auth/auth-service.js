/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO DE AUTENTICAÇÃO (auth-service.js)
 * =========================================================================
 *
 * Camada de serviço de autenticação. Não mexe em DOM.
 *
 * Funções exportadas:
 *   - login(email, senha)         → autentica e devolve { user, adminData }
 *   - logout()                    → encerra a sessão
 *   - resetarSenha(email)         → envia e-mail de redefinição
 *   - escutarSessao(callback)     → fica ouvindo o estado da sessão
 *   - obterAdminLogado(user)      → busca o doc /administradores/{uid}
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";

import {
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

import {
    doc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* =========================================================================
 * HELPER — ESPERAR FIRESTORE RECONECTAR
 * =========================================================================
 *
 * Depois do login, o Firestore precisa reabrir o canal WebChannel com o
 * novo usuário autenticado. Isso leva alguns ms.
 *
 * Estratégia: fazer uma LEITURA INOFENSIVA em loop até ela responder
 * rápido (o que indica que o canal está OK), ou desistir após N tentativas.
 * =========================================================================
 */
async function esperarFirestoreConectado(db) {
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js");

    for (let i = 0; i < 10; i++) {
        try {
            // Tenta ler um doc qualquer com timeout curto
            const snap = await Promise.race([
                getDoc(doc(db, "cursos", "__probe__")),   // ID que provavelmente não existe
                new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1000))
            ]);
            // Se chegou aqui, o Firestore respondeu
            return true;
        } catch (e) {
            // Se foi timeout, espera 200ms e tenta de novo
            if (e.message === "timeout") {
                await new Promise((r) => setTimeout(r, 200));
                continue;
            }
            // Outro erro (permissão, etc.) — o canal respondeu, só não autorizou
            return true;
        }
    }
    console.warn("⚠️ Firestore não conectou após 10 tentativas");
    return false;
}
async function aguardarTokenPronto(user) {
    if (!user) return;

    // 1. Força a renovação do token (garante que está em cache)
    await user.getIdToken(true);

    // 2. Pequena pausa para o Firestore receber o token
    await new Promise((resolve) => setTimeout(resolve, 200));
}

/* =========================================================================
 * LOGIN
 * ========================================================================= */

export async function login(email, senha) {
    // 1. Autentica no Firebase Auth
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    const user = credencial.user;

    // 2. Aguarda o token
    await aguardarTokenPronto(user);

    // 3. ✅ AGUARDA O FIRESTORE RECONECTAR (novo)
    await esperarFirestoreConectado(db);

    // 4. Agora sim, busca o doc do admin
    const adminRef = doc(db, "administradores", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
        await signOut(auth);
        throw new Error("Este usuário não está cadastrado como administrador.");
    }

    const adminData = adminSnap.data();

    if (adminData.ativo !== true) {
        await signOut(auth);
        throw new Error("Este administrador está inativo. Contate o suporte.");
    }

    updateDoc(adminRef, {
        ultimo_login: serverTimestamp()
    }).catch((err) => {
        console.warn("Não foi possível atualizar o último login:", err);
    });

    return { user, adminData };
}
/* =========================================================================
 * LOGOUT
 * ========================================================================= */

export async function logout() {
    await signOut(auth);
}

/* =========================================================================
 * RESET DE SENHA
 * ========================================================================= */

export async function resetarSenha(email) {
    await sendPasswordResetEmail(auth, email);
}

/* =========================================================================
 * ESCUTAR SESSÃO
 * ========================================================================= */

export function escutarSessao(callback) {
    return onAuthStateChanged(auth, callback);
}

/* =========================================================================
 * OBTER ADMIN LOGADO
 * ========================================================================= */

/**
 * Busca o documento /administradores/{uid}.
 *
 * Também aguarda o token para evitar o bug do getDoc pendurado.
 */
export async function obterAdminLogado(user) {
    if (!user) return null;

    // ⚡ Força o token antes de ler o Firestore
    await aguardarTokenPronto(user);

    const adminRef = doc(db, "administradores", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) return null;

    return { uid: user.uid, ...adminSnap.data() };
}