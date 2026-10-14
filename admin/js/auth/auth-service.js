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
 * HELPER — ESPERAR TOKEN
 * ========================================================================= */
async function aguardarTokenPronto(user) {
    if (!user) return;
    try {
        await user.getIdToken();
    } catch (e) {
        console.warn("Aviso ao obter token:", e);
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
}

/* =========================================================================
 * LOGIN
 * ========================================================================= */
export async function login(email, senha) {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    const user = credencial.user;

    await user.getIdToken();
    await new Promise((r) => setTimeout(r, 200));

    const adminRef = doc(db, "administradores", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists()) {
        await signOut(auth);
        throw new Error("Este usuário não está cadastrado como administrador.");
    }

    const adminData = adminSnap.data();

    if (adminData.ativo !== true) {
        await signOut(auth);
        throw new Error("Este administrador está inativo.");
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
 * ========================================================================= */
export async function obterAdminLogado(user) {
    if (!user) return null;

    await aguardarTokenPronto(user);

    for (let tentativa = 0; tentativa < 3; tentativa++) {
        try {
            const adminRef = doc(db, "administradores", user.uid);
            const adminSnap = await getDoc(adminRef);

            if (!adminSnap.exists()) return null;
            return { uid: user.uid, ...adminSnap.data() };
        } catch (e) {
            if (e.code === "permission-denied" && tentativa < 2) {
                console.warn(`[auth] retry ${tentativa + 1}/3`);
                await new Promise((r) => setTimeout(r, 300));
                continue;
            }
            throw e;
        }
    }
    return null;
}

/* ==========================================================================
 * TIMEOUT DE INATIVIDADE
 * ==========================================================================
 * Se o admin não interagir por X minutos, faz logout automático.
 * Padrão: 30 minutos.
 * ========================================================================== */

const TIMEOUT_INATIVIDADE_MS = 30 * 60 * 1000; // 30 minutos

let _timerInatividade = null;
let _estaEscutando = false;

/**
 * Inicia o monitor de inatividade. Deve ser chamado após login bem-sucedido.
 */
export function iniciarMonitorInatividade() {
    if (_estaEscutando) return;
    _estaEscutando = true;

    const reiniciarTimer = () => {
        if (_timerInatividade) clearTimeout(_timerInatividade);

        _timerInatividade = setTimeout(async () => {
            console.warn("[inatividade] Sessão expirada por inatividade");
            pararMonitorInatividade();
            await logoutPorInatividade();
        }, TIMEOUT_INATIVIDADE_MS);
    };

    const eventos = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];
    eventos.forEach(evt => {
        document.addEventListener(evt, reiniciarTimer, { passive: true });
    });

    reiniciarTimer();

    window.__inatividade_eventos = eventos;
    window.__inatividade_callback = reiniciarTimer;
}

/**
 * Para o monitor de inatividade. Chamado no logout.
 */
export function pararMonitorInatividade() {
    if (_timerInatividade) {
        clearTimeout(_timerInatividade);
        _timerInatividade = null;
    }

    const eventos = window.__inatividade_eventos || [];
    const callback = window.__inatividade_callback;

    if (callback) {
        eventos.forEach(evt => {
            document.removeEventListener(evt, callback);
        });
    }

    window.__inatividade_eventos = null;
    window.__inatividade_callback = null;
    _estaEscutando = false;
}

/**
 * Realiza logout por inatividade e marca uma flag no sessionStorage
 * para evitar que a página de login reloge automaticamente.
 */
export async function logoutPorInatividade() {
    sessionStorage.setItem("tw_logout_inatividade", "1");

    try {
        await signOut(auth);
    } catch (e) {
        console.error("Erro no signOut:", e);
    }

    window.location.replace("login.html");
}