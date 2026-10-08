/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO DE AUTENTICAÇÃO (auth-service.js)
 * =========================================================================
 * Camada de serviço de autenticação. Não mexe em DOM.
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
 * HELPER — ESPERAR TOKEN (SEM FORÇAR REFRESH DE REDE)
 * =========================================================================
 * O `getIdToken(true)` faz uma requisição de rede e pode demorar 5-30s
 * (ou travar). O `getIdToken()` usa o cache local e é instantâneo.
 * =========================================================================
 */
async function aguardarTokenPronto(user) {
    if (!user) return;
    try {
        await user.getIdToken();   // usa cache, é instantâneo
    } catch (e) {
        console.warn("Aviso ao obter token:", e);
    }
    // Delay mínimo (era 100ms, agora 20ms)
    await new Promise((resolve) => setTimeout(resolve, 20));
}

/* =========================================================================
 * LOGIN
 * ========================================================================= */

export async function login(email, senha) {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    const user = credencial.user;

    await aguardarTokenPronto(user);

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
 * OBTER ADMIN LOGADO — COM RETRY
 * =========================================================================
 * Tenta até 3 vezes. Se der permission-denied, espera 500ms e tenta
 * de novo. Isso resolve o timing entre o login e a propagação do token.
 * =========================================================================
 */

export async function obterAdminLogado(user) {
    if (!user) return null;

    await aguardarTokenPronto(user);

    // Tenta 3x com espera de 300ms (era 500ms)
    for (let tentativa = 0; tentativa < 3; tentativa++) {
        try {
            const adminRef = doc(db, "administradores", user.uid);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) return null;
            return { uid: user.uid, ...adminSnap.data() };
        } catch (e) {
            if (e.code === "permission-denied" && tentativa < 2) {
                console.warn(`[auth] retry ${tentativa + 1}/3`);
                await new Promise((r) => setTimeout(r, 300));   // ← 300ms
                continue;
            }
            throw e;
        }
    }
    return null;
}