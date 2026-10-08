// admin/js/backend/calendario-aulas-service.js

import { 
    getFirestore, 
    doc, 
    updateDoc, 
    arrayUnion, 
    arrayRemove, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const db = getFirestore();

/**
 * Atualiza/Reagenda uma aula substituindo a entrada no array 'cronograma'.
 */
export async function atualizarAulaBackend(cursoId, aulaAntiga, dadosNovos) {
    if (!cursoId || !aulaAntiga) throw new Error("Parâmetros inválidos para atualizar aula.");

    const aulaAtualizada = {
        ...aulaAntiga,
        instrutor: dadosNovos.instrutor,
        data: dadosNovos.data,
        hora_inicio: dadosNovos.hora_inicio,
        hora_fim: dadosNovos.hora_fim,
        sala: dadosNovos.sala,
        atualizado_em: new Date().toISOString()
    };

    try {
        const cursoRef = doc(db, "cursos", cursoId);
        
        // Remove o registo antigo e adiciona o atualizado
        await updateDoc(cursoRef, { cronograma: arrayRemove(aulaAntiga) });
        await updateDoc(cursoRef, { cronograma: arrayUnion(aulaAtualizada) });

        return true;
    } catch (err) {
        console.error("Erro ao atualizar aula no Firestore:", err);
        throw err;
    }
}

export function verificarConflitoProfessorMemoria(listaCursos, professorNome, dataAula, horaInicio, horaFim, cursoIdAtual = null, idAulaIgnorar = null) {
    if (!professorNome || !dataAula || !horaInicio || !horaFim || !Array.isArray(listaCursos)) return null;

    const profProcurado = professorNome.trim().toLowerCase();
    let conflito = null;

    listaCursos.forEach(curso => {
        const cronograma = curso.cronograma || [];
        
        cronograma.forEach(aula => {
            // Se estiver a editar a própria aula, ignora-a na verificação
            if (idAulaIgnorar && aula.id === idAulaIgnorar) return;

            const profAula = String(aula.instrutor || aula.professor || "").trim().toLowerCase();

            if (profAula === profProcurado && aula.data === dataAula) {
                const inicioExistente = aula.hora_inicio;
                const fimExistente = aula.hora_fim;

                if (horaInicio < fimExistente && horaFim > inicioExistente) {
                    const ehMesmoCurso = (curso.id === cursoIdAtual);
                    
                    conflito = {
                        cursoNome: ehMesmoCurso ? "este mesmo curso" : (curso.nome || curso.nome_curso || "Outro Curso"),
                        horario: `${aula.hora_inicio} às ${aula.hora_fim}`,
                        sala: aula.sala || "Não informada",
                        ehMesmoCurso
                    };
                }
            }
        });
    });

    return conflito;
}

export async function salvarAulaBackend(cursoId, dadosAula) {
    if (!cursoId) throw new Error("ID do curso não informado.");

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
        const cursoRef = doc(db, "cursos", cursoId);
        await updateDoc(cursoRef, {
            cronograma: arrayUnion(payloadAula)
        });
        return idAula;
    } catch (err) {
        console.error("Erro ao salvar aula no array do curso:", err);
        throw err;
    }
}

export async function removerAulaBackend(cursoId, aulaObjeto) {
    if (!cursoId || !aulaObjeto) throw new Error("Parâmetros inválidos para remoção de aula.");

    try {
        const cursoRef = doc(db, "cursos", cursoId);
        await updateDoc(cursoRef, {
            cronograma: arrayRemove(aulaObjeto)
        });
        return true;
    } catch (err) {
        console.error("Erro ao remover aula do array no Firestore:", err);
        throw err;
    }
}