// ==========================================================================
// TRAINING WORK — SERVICE DE PRESENÇA (presenca-service.js)
// ==========================================================================
// Responsável por:
//   - Obter presenças de uma aula
//   - Salvar presenças em lote (com auditoria)
//   - Calcular frequência por aluno
//   - Calcular estatísticas da turma
// ==========================================================================

import { auth, db } from "../firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { registrarAuditoriaGenerica } from "./auditoria-service.js";

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
 * Compara presenças ANTES e DEPOIS, retornando lista de alterações
 * no formato do "novo padrão de auditoria" (granular, 1 por aluno).
 *
 * @param {Array} antes  - presenças no formato [{ aluno_id, aluno_nome, status, marcado_em }]
 * @param {Array} depois - presenças no formato [{ aluno_id, aluno_nome, status, marcado_em }]
 * @param {string} aulaId - ID da aula (usado como prefixo do campo)
 * @returns {Array} [{ campo, valor_anterior, valor_novo }]
 */
export function compararPresencas(antes = [], depois = [], aulaId = "") {
    const alteracoes = [];
    const prefixo = aulaId ? `presenca.aula_${aulaId}` : "presenca";

    // Mapa para lookup rápido: aluno_id → presença
    const mapaAntes = {};
    (Array.isArray(antes) ? antes : []).forEach(p => {
        if (p?.aluno_id) mapaAntes[p.aluno_id] = p;
    });

    const mapaDepois = {};
    (Array.isArray(depois) ? depois : []).forEach(p => {
        if (p?.aluno_id) mapaDepois[p.aluno_id] = p;
    });

    // 1) Alunos que estavam ANTES → verifica se mudou
    Object.keys(mapaAntes).forEach(alunoId => {
        const a = mapaAntes[alunoId];
        const b = mapaDepois[alunoId];

        // Aluno removido da lista de presenças
        if (!b) {
            alteracoes.push({
                campo: `${prefixo}.${alunoId}`,
                valor_anterior: a.status ?? null,
                valor_novo: null
            });
            return;
        }

        // Mudou de status
        if (a.status !== b.status) {
            alteracoes.push({
                campo: `${prefixo}.${alunoId}`,
                valor_anterior: a.status ?? null,
                valor_novo: b.status ?? null
            });
        }
    });

    // 2) Alunos que só aparecem DEPOIS (novos na lista)
    Object.keys(mapaDepois).forEach(alunoId => {
        if (mapaAntes[alunoId]) return; // já tratado
        const b = mapaDepois[alunoId];
        alteracoes.push({
            campo: `${prefixo}.${alunoId}`,
            valor_anterior: null,
            valor_novo: b.status ?? null
        });
    });

    return alteracoes;
}

/**
 * Salva as presenças de uma aula (substitui o array inteiro).
 * Registra auditoria em turmas/{turmaId}/auditoria.
 *
 * @param {string} turmaId
 * @param {string} aulaId
 * @param {Array} presencas - [{ aluno_id, aluno_nome, status }]
 * @returns {Promise<{ok: boolean, tipo: string, alteracoes: number}>}
 */
export async function salvarPresencasDaAula(turmaId, aulaId, presencas) {
    if (!turmaId || !aulaId) throw new Error("Parâmetros inválidos.");

    const { turmaRef, cronograma, indexAula, aula } = await obterAula(turmaId, aulaId);
    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    // 1. Estado ANTES (o que estava no Firestore)
    const presencasAntes = Array.isArray(aula.presencas) ? aula.presencas : [];
    const jaExistiaRegistro = presencasAntes.length > 0;

    // 2. Formata o novo estado
    const presencasFormatadas = presencas.map(p => ({
        aluno_id: p.aluno_id,
        aluno_nome: p.aluno_nome || "",
        status: p.status || "ausente",
        marcado_em: agora
    }));

    // 3. Atualiza o cronograma
    const novoCronograma = [...cronograma];
    novoCronograma[indexAula] = {
        ...novoCronograma[indexAula],
        presencas: presencasFormatadas,
        presenca_atualizada_em: agora,
        presenca_atualizada_por: adminEmail
    };

    await updateDoc(turmaRef, { cronograma: novoCronograma });

    // 4. Auditoria
    const alteracoes = compararPresencas(presencasAntes, presencasFormatadas, aulaId);

    // Se nada mudou, não grava log (evita ruído)
    if (alteracoes.length === 0 && jaExistiaRegistro) {
        return { ok: true, tipo: "sem_alteracao", alteracoes: 0 };
    }

    const tipo = jaExistiaRegistro ? "alteracao_presenca" : "registro_presenca";
    const dataAula = aula?.data ? formatarDataBR(aula.data) : "sem data";
    const descricao = jaExistiaRegistro
        ? `${alteracoes.length} presença(s) alterada(s) na aula de ${dataAula}`
        : `Presenças registradas para a aula de ${dataAula}`;

    await registrarAuditoriaGenerica("turmas", turmaId, {
        tipo,
        entidade: "turma",
        descricao,
        campos_alterados: alteracoes
    });

    return { ok: true, tipo, alteracoes: alteracoes.length };
}

/* ==========================================================================
 * HELPERS INTERNOS
 * ========================================================================== */

function formatarDataBR(dataISO) {
    if (!dataISO || typeof dataISO !== "string") return "sem data";
    const partes = dataISO.split("-");
    if (partes.length !== 3) return dataISO;
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
}

/* ==========================================================================
 * CÁLCULOS (inalterados)
 * ========================================================================== */

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