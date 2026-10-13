// ==========================================================================
// TRAINING WORK — SERVICE: FICHA DO ALUNO
// ==========================================================================
// Busca dados agregados de um aluno:
//   - Dados pessoais
//   - Lista de matrículas (da subcoleção /alunos/{id}/matriculas)
//   - Frequência de cada matrícula (cruzando com /turmas)
//   - Resumo financeiro
// ==========================================================================

import { db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const FREQUENCIA_MINIMA = 75;

/**
 * Busca a ficha completa de um aluno.
 * @param {string} alunoId
 * @returns {Promise<Object>}
 */
export async function obterFichaCompleta(alunoId) {
    if (!alunoId) throw new Error("ID do aluno é obrigatório.");

    // 1. Dados do aluno
    const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
    if (!alunoSnap.exists()) throw new Error("Aluno não encontrado.");

    const aluno = { id: alunoSnap.id, ...alunoSnap.data() };

    // 2. Matrículas
    const matriculas = await listarMatriculasComFrequencia(alunoId);

    // 3. Resumo financeiro
    const financeiro = calcularResumoFinanceiro(matriculas);

    return {
        aluno,
        matriculas,
        financeiro
    };
}

/**
 * Lista matrículas com frequência calculada.
 */
export async function listarMatriculasComFrequencia(alunoId) {
    const ref = collection(db, "alunos", alunoId, "matriculas");
    const snap = await getDocs(ref);

    const matriculas = [];
    for (const d of snap.docs) {
        const m = d.data();
        if (m.excluido === true) continue;

        // Calcula frequência da matrícula
        const frequencia = await calcularFrequenciaDaMatricula(alunoId, m);

        matriculas.push({
            id: d.id,
            ...m,
            _frequencia: frequencia
        });
    }

    // Ordena por data (mais recentes primeiro)
    matriculas.sort((a, b) => {
        const tA = new Date(a.criado_em || 0).getTime();
        const tB = new Date(b.criado_em || 0).getTime();
        return tB - tA;
    });

    return matriculas;
}

/**
 * Calcula frequência de uma matrícula cruzando com o cronograma da turma.
 */
async function calcularFrequenciaDaMatricula(alunoId, matricula) {
    const turmaId = matricula.turma_id;
    if (!turmaId) {
        return { total_aulas: 0, presencas: 0, ausencias: 0, justificadas: 0, taxa: 0, aulas: [] };
    }

    const turmaSnap = await getDoc(doc(db, "turmas", turmaId));
    if (!turmaSnap.exists()) {
        return { total_aulas: 0, presencas: 0, ausencias: 0, justificadas: 0, taxa: 0, aulas: [] };
    }

    const turma = turmaSnap.data();
    const cronograma = turma.cronograma || [];

    let presencas = 0;
    let ausencias = 0;
    let justificadas = 0;
    const aulas = [];

    cronograma.forEach(aula => {
        const listaPresenca = aula.presencas;
        if (!Array.isArray(listaPresenca) || listaPresenca.length === 0) return;

        const registro = listaPresenca.find(p => p.aluno_id === alunoId);
        const status = registro ? registro.status : "sem_registro";

        aulas.push({
            data: aula.data,
            hora_inicio: aula.hora_inicio,
            hora_fim: aula.hora_fim,
            instrutor: aula.instrutor || "",
            sala: aula.sala || "",
            status
        });

        if (status === "presente") presencas++;
        else if (status === "ausente") ausencias++;
        else if (status === "justificado") justificadas++;
    });

    const total = aulas.length;
    const taxa = total > 0 ? Math.round((presencas / total) * 100) : 0;

    return {
        total_aulas: total,
        presencas,
        ausencias,
        justificadas,
        taxa,
        aulas
    };
}

/**
 * Calcula resumo financeiro das matrículas.
 */
function calcularResumoFinanceiro(matriculas) {
    let totalPago = 0;
    let totalPendente = 0;
    let totalGeral = 0;

    matriculas.forEach(m => {
        const valor = Number(m.valor || 0);
        totalGeral += valor;

        const status = String(m.status_pagamento || "").toLowerCase();
        if (status.includes("recebido") || status.includes("pago")) {
            totalPago += valor;
        } else {
            totalPendente += valor;
        }
    });

    return {
        total_geral: totalGeral,
        total_pago: totalPago,
        total_pendente: totalPendente
    };
}