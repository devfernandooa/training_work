// admin/js/backend/calendario-aulas-service.js

import { db } from "../firebase-config.js";
import {
    doc,
    getDoc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// ⚠️ Coleção correta: TURMAS (não cursos)
const NOME_COLECAO = "turmas";

/**
 * Atualiza/Reagenda uma aula substituindo a entrada no array 'cronograma'.
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

    // ✅ Substitui pelo novo objeto
    const aulaAtualizada = {
        ...cronogramaAtual[indexAula],
        instrutor: dadosNovos.instrutor,
        data: dadosNovos.data,
        hora_inicio: dadosNovos.hora_inicio,
        hora_fim: dadosNovos.hora_fim,
        sala: dadosNovos.sala,
        atualizado_em: new Date().toISOString()
    };

    const novoCronograma = [...cronogramaAtual];
    novoCronograma[indexAula] = aulaAtualizada;

    // ✅ Update único, sem arrayUnion/arrayRemove
    await updateDoc(turmaRef, { cronograma: novoCronograma });

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

export async function salvarAulaBackend(turmaId, dadosAula) {
    if (!turmaId) throw new Error("ID da turma não informado.");

    const idAula = "aula_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    const payloadAula = {
        id: idAula,
        instrutor: dadosAula.instrutor || "",
        data: dadosAula.data,
        hora_inicio: dadosAula.hora_inicio,
        hora_fim: dadosAula.hora_fim,
        sala: dadosAula.sala || "Auditório Principal",
        criado_em: new Date().toISOString()
    };

    try {
        const turmaRef = doc(db, NOME_COLECAO, turmaId);
        await updateDoc(turmaRef, {
            cronograma: arrayUnion(payloadAula)
        });
        return idAula;
    } catch (err) {
        console.error("Erro ao salvar aula no array da turma:", err);
        throw err;
    }
}

export async function removerAulaBackend(turmaId, aulaObjeto) {
    if (!turmaId || !aulaObjeto) throw new Error("Parâmetros inválidos para remoção de aula.");

    try {
        const turmaRef = doc(db, NOME_COLECAO, turmaId);
        await updateDoc(turmaRef, {
            cronograma: arrayRemove(aulaObjeto)
        });
        return true;
    } catch (err) {
        console.error("Erro ao remover aula do array no Firestore:", err);
        throw err;
    }
}