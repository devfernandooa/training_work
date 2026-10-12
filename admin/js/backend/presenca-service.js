// ==========================================================================
// TRAINING WORK — SERVICE DE PRESENÇA (presenca-service.js)
// ==========================================================================
// Responsável por:
//   - Obter presenças de uma aula
//   - Salvar presenças em lote
//   - Calcular frequência por aluno
//   - Calcular estatísticas da turma
// ==========================================================================

import { db } from "../firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const NOME_COLECAO = "turmas";

/**
 * Obtém a aula específica dentro do cronograma da turma.
 */
async function obterAula(turmaId, aulaId) {
    const turmaRef = doc(db, NOME_COLECAO, turmaId);
    const snap = await getDoc(turmaRef);

    if (!snap.exists()) throw new Error("Turma não encontrada.");

    const turma = snap.data();
    const cronograma = Array.isArray(turma.cronograma) ? turma.cronograma : [];
    const indexAula = cronograma.findIndex(a => a.id === aulaId);

    if (indexAula === -1) throw new Error("Aula não encontrada.");

    return { turmaRef, turma, cronograma, indexAula, aula: cronograma[indexAula] };
}

/**
 * Retorna as presenças registradas de uma aula.
 * @param {string} turmaId
 * @param {string} aulaId
 * @returns {Promise<Array>} [{ aluno_id, aluno_nome, status, marcado_em }]
 */
export async function obterPresencasDaAula(turmaId, aulaId) {
    const { aula } = await obterAula(turmaId, aulaId);
    return Array.isArray(aula.presencas) ? aula.presencas : [];
}

/**
 * Salva as presenças de uma aula (substitui o array inteiro).
 * @param {string} turmaId
 * @param {string} aulaId
 * @param {Array} presencas - [{ aluno_id, aluno_nome, status }]
 */
export async function salvarPresencasDaAula(turmaId, aulaId, presencas) {
    if (!turmaId || !aulaId) throw new Error("Parâmetros inválidos.");

    const { turmaRef, cronograma, indexAula } = await obterAula(turmaId, aulaId);

    const presencasFormatadas = presencas.map(p => ({
        aluno_id: p.aluno_id,
        aluno_nome: p.aluno_nome || "",
        status: p.status || "ausente",
        marcado_em: new Date().toISOString()
    }));

    const novoCronograma = [...cronograma];
    novoCronograma[indexAula] = {
        ...novoCronograma[indexAula],
        presencas: presencasFormatadas,
        presenca_atualizada_em: new Date().toISOString()
    };

    await updateDoc(turmaRef, { cronograma: novoCronograma });
    return true;
}

/**
 * Calcula estatísticas de frequência de uma aula.
 * @param {Array} presencas
 * @returns {Object} { total, presentes, ausentes, justificados, taxa }
 */
export function calcularEstatisticasAula(presencas) {
    const lista = Array.isArray(presencas) ? presencas : [];

    const presentes = lista.filter(p => p.status === "presente").length;
    const ausentes = lista.filter(p => p.status === "ausente").length;
    const justificados = lista.filter(p => p.status === "justificado").length;
    const total = lista.length;
    const taxa = total > 0 ? Math.round((presentes / total) * 100) : 0;

    return { total, presentes, ausentes, justificados, taxa };
}

/**
 * Calcula a frequência de um aluno em toda a turma.
 * @param {Array} cronograma - O array de aulas da turma
 * @param {string} alunoId
 * @returns {Object} { aulas_totais, presencas, ausencias, justificadas, taxa }
 */
export function calcularFrequenciaAluno(cronograma, alunoId) {
    const aulas = Array.isArray(cronograma) ? cronograma : [];

    let presencas = 0;
    let ausencias = 0;
    let justificadas = 0;
    let aulasComRegistro = 0;

    aulas.forEach(aula => {
        const listaPresenca = aula.presencas;
        if (!Array.isArray(listaPresenca)) return;

        const registro = listaPresenca.find(p => p.aluno_id === alunoId);
        if (!registro) return;

        aulasComRegistro++;

        if (registro.status === "presente") presencas++;
        else if (registro.status === "ausente") ausencias++;
        else if (registro.status === "justificado") justificadas++;
    });

    const taxa = aulasComRegistro > 0
        ? Math.round((presencas / aulasComRegistro) * 100)
        : 0;

    return {
        aulas_totais: aulasComRegistro,
        presencas,
        ausencias,
        justificadas,
        taxa
    };
}

/**
 * Calcula estatísticas consolidadas de uma turma inteira.
 * @param {Object} turma
 * @param {Array} alunos - Lista de alunos matriculados
 * @returns {Array} lista com frequência por aluno
 */
export function calcularEstatisticasTurma(turma, alunos) {
    const cronograma = turma?.cronograma || [];

    return (alunos || []).map(aluno => {
        const alunoId = aluno.aluno_id || aluno.id;
        const stats = calcularFrequenciaAluno(cronograma, alunoId);
        return {
            aluno_id: alunoId,
            aluno_nome: aluno.nome || aluno.aluno_nome || "Aluno",
            ...stats
        };
    });
}