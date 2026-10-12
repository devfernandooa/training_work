// ==========================================================================
// TRAINING WORK — SERVICE DE MATRÍCULAS (dentro do aluno)
// ==========================================================================
// Novo modelo: /alunos/{alunoId}/matriculas/{matriculaId}
//
// Este service NÃO substitui o matriculas-service.js antigo ainda.
// Vai ser usado na Fase 2, quando as UIs forem migradas.
// ==========================================================================

import { db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ==========================================================================
 * LEITURA
 * ========================================================================== */

/**
 * Escuta todas as matrículas de um aluno em tempo real.
 */
export function escutarMatriculasDoAluno(alunoId, callback) {
    if (!alunoId) return () => {};

    const ref = collection(db, "alunos", alunoId, "matriculas");

    return onSnapshot(ref, (snapshot) => {
        const matriculas = [];
        snapshot.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            matriculas.push({ id: d.id, ...data });
        });

        // Ordena por data (mais recentes primeiro)
        matriculas.sort((a, b) => {
            const tA = new Date(a.criado_em || 0).getTime();
            const tB = new Date(b.criado_em || 0).getTime();
            return tB - tA;
        });

        if (typeof callback === "function") callback(matriculas);
    }, (erro) => {
        console.error("❌ escutarMatriculasDoAluno:", erro);
        if (typeof callback === "function") callback([]);
    });
}

/**
 * Obtém uma matrícula específica por ID.
 */
export async function obterMatricula(alunoId, matriculaId) {
    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);
    const snap = await getDoc(ref);

    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Lista todas as matrículas de todos os alunos (uso global).
 * ⚠️ Não use em tempo real — é pesado. Use para relatórios.
 */
export async function listarTodasMatriculas() {
    const alunosSnap = await getDocs(collection(db, "alunos"));
    const todas = [];

    for (const alunoDoc of alunosSnap.docs) {
        const matSnap = await getDocs(collection(db, "alunos", alunoDoc.id, "matriculas"));
        matSnap.forEach(m => {
            const data = m.data();
            if (data.excluido === true) return;
            todas.push({ id: m.id, aluno_id: alunoDoc.id, ...data });
        });
    }

    return todas;
}

/* ==========================================================================
 * ESCRITA
 * ========================================================================== */

/**
 * Cria uma nova matrícula para um aluno.
 */
export async function criarMatricula(alunoId, dadosMatricula) {
    if (!alunoId) throw new Error("ID do aluno é obrigatório.");

    const agora = new Date().toISOString();

    const novaMatricula = {
        aluno_id: alunoId,
        turma_id: dadosMatricula.turma_id || "",
        turma_codigo: dadosMatricula.turma_codigo || "",

        aluno_nome: dadosMatricula.aluno_nome || "",
        aluno_email: dadosMatricula.aluno_email || "",
        aluno_cpf: dadosMatricula.aluno_cpf || "",

        curso_nome: dadosMatricula.curso_nome || "",

        valor: Number(dadosMatricula.valor || 0),
        forma_pagamento: dadosMatricula.forma_pagamento || "Pix",
        status_pagamento: dadosMatricula.status_pagamento || "Aguardando pagamento",

        status: dadosMatricula.status || "cursando",

        data_matricula: agora,
        criado_em: agora,
        atualizado_em: agora,

        // Campos de certificado (inicialmente vazios)
        frequencia_final: null,
        total_aulas: null,
        presencas: null,
        ausencias: null,
        justificadas: null,
        apto_certificado: false,
        concluido_em: null,
        concluido_por: null,
        certificado_emitido: false,
        certificado_codigo: null,
        certificado_url: null,
        certificado_emitido_em: null,
        certificado_emitido_por: null,
        certificado_reemissoes: [],

        excluido: false
    };

    const ref = await addDoc(collection(db, "alunos", alunoId, "matriculas"), novaMatricula);
    return { id: ref.id, ...novaMatricula };
}

/**
 * Atualiza uma matrícula existente (merge parcial).
 */
export async function atualizarMatricula(alunoId, matriculaId, dados) {
    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);
    await updateDoc(ref, {
        ...dados,
        atualizado_em: new Date().toISOString()
    });
    return true;
}

/**
 * Remove uma matrícula (soft delete).
 */
export async function excluirMatricula(alunoId, matriculaId) {
    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);
    await updateDoc(ref, {
        excluido: true,
        atualizado_em: new Date().toISOString()
    });
    return true;
}