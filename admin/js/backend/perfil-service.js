// ==========================================================================
// TRAINING WORK — SERVICE: PERFIL DO ADMIN
// ==========================================================================

import { auth, db } from "../firebase-config.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const COLECAO = "administradores";

/**
 * Obtém dados do admin logado
 */
export async function obterPerfil() {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    const ref = doc(db, COLECAO, user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error("Perfil não encontrado.");

    const dados = snap.data();

    // ✅ Converte Timestamps do Firestore em strings ISO
    const converterTimestamp = (val) => {
        if (!val) return null;
        if (typeof val.toDate === "function") {
            return val.toDate().toISOString();
        }
        if (typeof val === "string") return val;
        if (typeof val === "number") return new Date(val).toISOString();
        return null;
    };

    return {
        uid: user.uid,
        email: user.email,
        ...dados,
        ultimo_login: converterTimestamp(dados.ultimo_login),
        criado_em: converterTimestamp(dados.criado_em),
        atualizado_em: converterTimestamp(dados.atualizado_em)
    };
}
/**
 * Atualiza dados do perfil (nome, telefone, cargo)
 */
export async function atualizarPerfil({ nome, telefone, cargo }) {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado.");

    const ref = doc(db, COLECAO, user.uid);
    await updateDoc(ref, {
        nome: nome || "",
        telefone: telefone || "",
        cargo: cargo || "",
        atualizado_em: new Date().toISOString()
    });

    return true;
}

/**
 * Envia e-mail de redefinição de senha
 */
export async function enviarResetSenha() {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("E-mail não disponível.");

    await sendPasswordResetEmail(auth, user.email);
    return true;
}