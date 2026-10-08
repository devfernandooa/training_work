/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO DE CURSOS (cursos-service.js)
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const NOME_COLECAO = "cursos";

function normalizarCurso(docSnap) {
    const d = docSnap.data();

    return {
        id: docSnap.id,
        ...d,
        codigo: d.codigo || d.codigo_curso || "",
        apelido: d.apelido || "",
        nome: d.nome || d.nome_curso || "",
        descricao: d.descricao || "",
        ementa: d.ementa || "",
        carga_horaria: Number(d.carga_horaria || d.carga || 0),
        investimento_base: Number(d.investimento_base || d.valor || 0),
        modalidade_padrao: d.modalidade_padrao || d.modalidade || "Presencial",
        secaoExibicao: d.secaoExibicao || "grade",
        ativo: d.ativo !== undefined ? !!d.ativo : (String(d.status || "ativo").toLowerCase() !== "inativo"),
        criado_em: d.criado_em || "",
        atualizado_em: d.atualizado_em || d.atualizado || "",
        atualizado_por: d.atualizado_por || "",
        excluido: !!d.excluido
    };
}

/**
 * Escuta cursos em tempo real.
 * @param {Function} callback
 * @param {Object} opcoes
 * @param {boolean} opcoes.incluirExcluidos — Se true, retorna também os excluídos
 */
export function escutarCursos(callback, opcoes = {}) {
    const incluirExcluidos = opcoes.incluirExcluidos !== false;
    const colRef = collection(db, NOME_COLECAO);

    return onSnapshot(
        colRef,
        (snapshot) => {
            const cursos = [];
            snapshot.forEach((docSnap) => {
                const curso = normalizarCurso(docSnap);
                if (!incluirExcluidos && curso.excluido) return;
                cursos.push(curso);
            });

            cursos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
            if (typeof callback === "function") callback(cursos);
        },
        (erro) => {
            console.error("❌ Erro ao escutar /cursos:", erro);
            if (typeof callback === "function") callback([]);
        }
    );
}

export async function obterCursoPorId(id) {
    try {
        const snap = await getDoc(doc(db, NOME_COLECAO, id));
        if (!snap.exists()) return null;
        return normalizarCurso(snap);
    } catch (erro) {
        console.error("❌ Erro ao obter curso:", erro);
        throw erro;
    }
}

export async function obterCursos() {
    try {
        const snap = await getDocs(collection(db, NOME_COLECAO));
        const cursos = [];
        snap.forEach((d) => {
            const curso = normalizarCurso(d);
            if (!curso.excluido) cursos.push(curso);
        });
        return cursos;
    } catch (erro) {
        console.error("❌ Erro ao obter cursos:", erro);
        throw erro;
    }
}

export async function criarCurso(dados) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        const payload = {
            codigo: String(dados.codigo || "").toUpperCase().trim(),
            apelido: String(dados.apelido || "").trim(),
            nome: String(dados.nome || "").trim(),
            descricao: String(dados.descricao || "").trim(),
            ementa: String(dados.ementa || "").trim(),
            carga_horaria: Number(dados.carga_horaria || 0),
            investimento_base: Number(dados.investimento_base || 0),
            modalidade_padrao: dados.modalidade_padrao || "Presencial",
            secaoExibicao: dados.secaoExibicao || "grade",
            ativo: dados.ativo !== false,
            criado_em: agora,
            atualizado_em: agora,
            atualizado_por: usuario,
            excluido: false
        };

        if (!payload.codigo) throw new Error("Código é obrigatório.");
        if (!payload.nome) throw new Error("Nome do curso é obrigatório.");

        const ref = await addDoc(collection(db, NOME_COLECAO), payload);
        console.log(`✅ Curso criado: ${ref.id}`);
        return { id: ref.id, ...payload };
    } catch (erro) {
        console.error("❌ Erro ao criar curso:", erro);
        throw erro;
    }
}

export async function editarCurso(id, dados) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        const payload = {
            codigo: String(dados.codigo || "").toUpperCase().trim(),
            apelido: String(dados.apelido || "").trim(),
            nome: String(dados.nome || "").trim(),
            descricao: String(dados.descricao || "").trim(),
            ementa: String(dados.ementa || "").trim(),
            carga_horaria: Number(dados.carga_horaria || 0),
            investimento_base: Number(dados.investimento_base || 0),
            modalidade_padrao: dados.modalidade_padrao || "Presencial",
            secaoExibicao: dados.secaoExibicao || "grade",
            ativo: dados.ativo !== false,
            atualizado_em: agora,
            atualizado_por: usuario
        };

        await updateDoc(doc(db, NOME_COLECAO, id), payload);
        console.log(`✏️ Curso editado: ${id}`);
        return { id, ...payload };
    } catch (erro) {
        console.error("❌ Erro ao editar curso:", erro);
        throw erro;
    }
}

/**
 * Exclusão LÓGICA (soft delete). O doc permanece no Firestore com `excluido: true`.
 */
export async function excluirCurso(id) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: true,
            atualizado_em: agora,
            atualizado_por: usuario
        });
        console.log(`🗑️ Curso excluído (soft delete): ${id}`);
    } catch (erro) {
        console.error("❌ Erro ao excluir curso:", erro);
        throw erro;
    }
}

/**
 * ⚡ NOVO: Reativa um curso que foi excluído logicamente.
 * Remove o campo `excluido` (ou o coloca como false).
 */
export async function reativarCurso(id) {
    try {
        const usuario = auth.currentUser?.email || "Sistema";
        const agora = new Date().toISOString();

        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: false,
            atualizado_em: agora,
            atualizado_por: usuario
        });
        console.log(`♻️ Curso reativado: ${id}`);
    } catch (erro) {
        console.error("❌ Erro ao reativar curso:", erro);
        throw erro;
    }
}

export const escutarCursosService = escutarCursos;