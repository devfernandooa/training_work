// admin/js/backend/calendario-aulas-service.js

import { auth, db } from "../firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { registrarAuditoriaGenerica } from "./auditoria-service.js";

// ⚠️ Coleção correta: TURMAS (não cursos)
const NOME_COLECAO = "turmas";

/* ==========================================================================
 * HELPERS INTERNOS
 * ========================================================================== */

/**
 * Formata "2026-10-23" → "23/10/2026" (para descrição do log).
 */
function formatarDataBR(dataISO) {
    if (!dataISO || typeof dataISO !== "string") return "sem data";
    const partes = dataISO.split("-");
    if (partes.length !== 3) return dataISO;
    const [y, m, d] = partes;
    return `${d}/${m}/${y}`;
}

/**
 * Compara duas aulas e retorna lista de alterações no formato do
 * "novo padrão de auditoria" (granular, 1 por campo).
 *
 * @param {Object} antes  - aula antes (ou null se criação)
 * @param {Object} depois - aula depois
 * @returns {Array} [{ campo, valor_anterior, valor_novo }]
 */
function compararAula(antes, depois) {
    const CAMPOS = ["data", "hora_inicio", "hora_fim", "instrutor", "sala"];
    const alteracoes = [];
    const aulaId = depois?.id || antes?.id || "";
    const prefixo = aulaId ? `cronograma.aula_${aulaId}` : "cronograma";

    CAMPOS.forEach(campo => {
        const a = antes ? (antes[campo] ?? null) : null;
        const b = depois ? (depois[campo] ?? null) : null;

        if (JSON.stringify(a) !== JSON.stringify(b)) {
            alteracoes.push({
                campo: `${prefixo}.${campo}`,
                valor_anterior: a,
                valor_novo: b
            });
        }
    });

    return alteracoes;
}

/* ==========================================================================
 * OPERAÇÕES
 * ========================================================================== */

/**
 * Atualiza/Reagenda uma aula substituindo a entrada no array 'cronograma'.
 * Registra auditoria (alteracao_aula) em turmas/{turmaId}/auditoria.
 */
export async function atualizarAulaBackend(turmaId, aulaAntiga, dadosNovos) {
    if (!turmaId || !aulaAntiga) throw new Error("Parâmetros inválidos para atualizar aula.");

    const turmaRef = doc(db, NOME_COLECAO, turmaId);
    const turmaSnap = await getDoc(turmaRef);

    if (!turmaSnap.exists()) throw new Error("Turma não encontrada.");

    const turma = turmaSnap.data();
    const cronogramaAtual = Array.isArray(turma.cronograma) ? turma.cronograma : [];

    // ✅ Localiza a aula pelo ID (mais confiável que arrayRemove)
    const idAula = aulaAntiga.id;
    const indexAula = cronogramaAtual.findIndex(a => a.id === idAula);

    if (indexAula === -1) throw new Error("Aula não encontrada para atualizar.");

    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    // ✅ Substitui pelo novo objeto
    const aulaAtualizada = {
        ...cronogramaAtual[indexAula],
        instrutor: dadosNovos.instrutor,
        data: dadosNovos.data,
        hora_inicio: dadosNovos.hora_inicio,
        hora_fim: dadosNovos.hora_fim,
        sala: dadosNovos.sala,
        atualizado_em: agora,
        atualizado_por: adminEmail
    };

    const novoCronograma = [...cronogramaAtual];
    novoCronograma[indexAula] = aulaAtualizada;

    // ✅ Update único, sem arrayUnion/arrayRemove
    await updateDoc(turmaRef, { cronograma: novoCronograma });

    // 📝 Auditoria
    const alteracoes = compararAula(cronogramaAtual[indexAula], aulaAtualizada);
    if (alteracoes.length > 0) {
        await registrarAuditoriaGenerica("turmas", turmaId, {
            tipo: "alteracao_aula",
            entidade: "turma",
            descricao: `${alteracoes.length} campo(s) alterado(s) na aula de ${formatarDataBR(dadosNovos.data)}`,
            campos_alterados: alteracoes
        });
    }

    return true;
}

export function verificarConflitoProfessorMemoria(listaTurmas, professorNome, dataAula, horaInicio, horaFim, turmaIdAtual = null, idAulaIgnorar = null) {
    if (!professorNome || !dataAula || !horaInicio || !horaFim || !Array.isArray(listaTurmas)) return null;

    const profProcurado = professorNome.trim().toLowerCase();
    let conflito = null;

    listaTurmas.forEach(turma => {
        const cronograma = turma.cronograma || [];

        cronograma.forEach(aula => {
            // Se estiver a editar a própria aula, ignora-a na verificação
            if (idAulaIgnorar && aula.id === idAulaIgnorar) return;

            const profAula = String(aula.instrutor || aula.professor || "").trim().toLowerCase();

            if (profAula === profProcurado && aula.data === dataAula) {
                const inicioExistente = aula.hora_inicio;
                const fimExistente = aula.hora_fim;

                if (horaInicio < fimExistente && horaFim > inicioExistente) {
                    const ehMesmaTurma = (turma.id === turmaIdAtual);

                    conflito = {
                        cursoNome: ehMesmaTurma ? "esta mesma turma" : (turma.nome || turma.nome_turma || "Outra Turma"),
                        horario: `${aula.hora_inicio} às ${aula.hora_fim}`,
                        sala: aula.sala || "Não informada",
                        ehMesmoCurso: ehMesmaTurma
                    };
                }
            }
        });
    });

    return conflito;
}

/**
 * Agenda uma nova aula (adiciona ao cronograma da turma).
 * Registra auditoria (criacao_aula).
 */
export async function salvarAulaBackend(turmaId, dadosAula) {
    if (!turmaId) throw new Error("ID da turma não informado.");

    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();
    const idAula = "aula_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const payloadAula = {
        id: idAula,
        instrutor: dadosAula.instrutor || "",
        data: dadosAula.data,
        hora_inicio: dadosAula.hora_inicio,
        hora_fim: dadosAula.hora_fim,
        sala: dadosAula.sala || "Auditório Principal",
        criado_em: agora,
        criado_por: adminEmail
    };

    try {
        const turmaRef = doc(db, NOME_COLECAO, turmaId);
        await updateDoc(turmaRef, {
            cronograma: arrayUnion(payloadAula)
        });

        // 📝 Auditoria (criação: "antes" é null)
        const alteracoes = compararAula(null, payloadAula);
        await registrarAuditoriaGenerica("turmas", turmaId, {
            tipo: "criacao_aula",
            entidade: "turma",
            descricao: `Aula agendada para ${formatarDataBR(dadosAula.data)} (${dadosAula.hora_inicio} às ${dadosAula.hora_fim})`,
            campos_alterados: alteracoes
        });

        return idAula;
    } catch (err) {
        console.error("Erro ao salvar aula no array da turma:", err);
        throw err;
    }
}

/**
 * Remove uma aula do cronograma da turma.
 * Registra auditoria (remocao_aula) ANTES de remover.
 */
export async function removerAulaBackend(turmaId, aulaObjeto) {
    if (!turmaId || !aulaObjeto) throw new Error("Parâmetros inválidos para remoção de aula.");

    try {
        const turmaRef = doc(db, NOME_COLECAO, turmaId);
        const turmaSnap = await getDoc(turmaRef);

        if (!turmaSnap.exists()) throw new Error("Turma não encontrada.");

        const turma = turmaSnap.data();
        const cronogramaAtual = Array.isArray(turma.cronograma) ? turma.cronograma : [];

        // ✅ Localiza a aula pelo ID (em vez de arrayRemove por igualdade)
        const idAula = aulaObjeto.id;
        const indexAula = cronogramaAtual.findIndex(a => a.id === idAula);

        if (indexAula === -1) throw new Error("Aula não encontrada para remover.");

        const aulaRemovida = cronogramaAtual[indexAula];

        // Filtra removendo só a aula em questão
        const novoCronograma = cronogramaAtual.filter((_, i) => i !== indexAula);

        await updateDoc(turmaRef, { cronograma: novoCronograma });

        // 📝 Auditoria (remoção: "depois" é null)
        const alteracoes = compararAula(aulaRemovida, null);
        await registrarAuditoriaGenerica("turmas", turmaId, {
            tipo: "remocao_aula",
            entidade: "turma",
            descricao: `Aula removida: ${formatarDataBR(aulaRemovida.data)} (${aulaRemovida.hora_inicio} às ${aulaRemovida.hora_fim})`,
            campos_alterados: alteracoes
        });

        return true;
    } catch (err) {
        console.error("Erro ao remover aula do array no Firestore:", err);
        throw err;
    }
}