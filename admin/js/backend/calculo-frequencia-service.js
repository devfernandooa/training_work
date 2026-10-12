// ==========================================================================
// TRAINING WORK — CÁLCULO DE FREQUÊNCIA
// ==========================================================================

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db } from "../firebase-config.js";

const FREQUENCIA_MINIMA = 75; // % mínimo para apto ao certificado

/**
 * Calcula frequência de um aluno numa turma (via matrícula).
 * @param {string} alunoId
 * @param {string} matriculaId
 * @returns {Promise<Object>}
 */
export async function calcularFrequenciaMatricula(alunoId, matriculaId) {
    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);
    const snap = await getDoc(ref);

    if (!snap.exists()) throw new Error("Matrícula não encontrada.");

    const matricula = snap.data();
    const turmaId = matricula.turma_id;

    if (!turmaId) {
        return {
            total_aulas: 0,
            presencas: 0,
            ausencias: 0,
            justificadas: 0,
            frequencia_final: 0,
            apto_certificado: false,
            apto_por_termino: false
        };
    }

    const turmaSnap = await getDoc(doc(db, "turmas", turmaId));
    if (!turmaSnap.exists()) throw new Error("Turma não encontrada.");

    const turma = turmaSnap.data();
    const cronograma = turma.cronograma || [];

    let totalAulas = 0;
    let presencas = 0;
    let ausencias = 0;
    let justificadas = 0;

    cronograma.forEach(aula => {
        if (!Array.isArray(aula.presencas) || aula.presencas.length === 0) return;

        totalAulas++;

        const registro = aula.presencas.find(p => p.aluno_id === alunoId);
        if (!registro) return;

        if (registro.status === "presente") presencas++;
        else if (registro.status === "ausente") ausencias++;
        else if (registro.status === "justificado") justificadas++;
    });

    const frequencia = totalAulas > 0
        ? Math.round((presencas / totalAulas) * 100)
        : 0;

    const aptoPorFrequencia = frequencia >= FREQUENCIA_MINIMA;
    const todasAulasRegistradas = cronograma.every(a =>
        !a.presencas || a.presencas.length === 0 || a.presencas.some(p => p.aluno_id === alunoId)
    );
    const apto_por_termino = totalAulas > 0 && todasAulasRegistradas;

    return {
        total_aulas: totalAulas,
        presencas,
        ausencias,
        justificadas,
        frequencia_final: frequencia,
        apto_certificado: aptoPorFrequencia && apto_por_termino,
        apto_por_termino
    };
}