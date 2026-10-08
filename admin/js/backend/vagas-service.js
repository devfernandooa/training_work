// ==========================================================================
// TRAINING WORK - SERVICE: VAGAS, METRICAS DO TOPO E DETALHES DA TURMA
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs,
    doc,
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

let db;

function getDbInstance() {
    if (!db) {
        db = getFirestore();
    }
    return db;
}

/**
 * Calcula a lotação individual e os indicadores globais do topo
 */
export async function obterLotacaoTurmasService() {
    const firestore = getDbInstance();

    try {
        const contagemMatriculasPorId = {};
        const contagemMatriculasPorNome = {};
        const alunosPorTurmaMap = {};

        // 1. Mapeia matrículas para contagem sem duplicação de lista
        try {
            const refMatriculas = collection(firestore, "matriculas");
            const snapMatriculas = await getDocs(refMatriculas);

            snapMatriculas.forEach(docSnap => {
                const data = docSnap.data();
                if (data.excluido === true) return;

                const statusLower = String(data.status_matricula || data.status || "").toLowerCase();
                const isAtivo = statusLower.includes("confirmad") || statusLower.includes("ativo") || statusLower.includes("pago") || statusLower.includes("recebido");

                if (isAtivo) {
                    const turmaId = data.turma_id || data.turmaId;
                    const cursoNomeClean = String(data.curso_nome || data.turma_nome || "").toLowerCase().trim();

                    const alunoObj = {
                        id: data.aluno_id || "N/A",
                        nome: data.aluno_nome || "Aluno não identificado",
                        email: data.aluno_email || "N/A",
                        forma_pagamento: data.forma_pagamento || "PIX",
                        status_pagamento: data.status_pagamento || "Recebido (Pago)",
                        frequencia: data.frequencia || "100%"
                    };

                    // Define uma chave primária para evitar duplicar contagem no mapa
                    const chaveTurma = turmaId || cursoNomeClean;

                    if (turmaId) {
                        contagemMatriculasPorId[turmaId] = (contagemMatriculasPorId[turmaId] || 0) + 1;
                    }
                    if (cursoNomeClean) {
                        contagemMatriculasPorNome[cursoNomeClean] = (contagemMatriculasPorNome[cursoNomeClean] || 0) + 1;
                    }

                    if (chaveTurma) {
                        if (!alunosPorTurmaMap[chaveTurma]) alunosPorTurmaMap[chaveTurma] = [];
                        alunosPorTurmaMap[chaveTurma].push(alunoObj);
                    }
                }
            });
        } catch (errMat) {
            console.warn("Aviso ao ler matrículas:", errMat);
        }

        // 2. Busca Turmas/Cursos das duas coleções sem duplicar IDs
        const turmasEcursos = [];
        const idsProcessados = new Set();

        try {
            const refTurmas = collection(firestore, "turmas");
            const snapTurmas = await getDocs(refTurmas);
            snapTurmas.forEach(d => {
                const data = d.data();
                if (data.excluido === true) return;
                turmasEcursos.push({ id: d.id, ...data });
                idsProcessados.add(d.id);
            });
        } catch (eT) {}

        try {
            const refCursos = collection(firestore, "cursos");
            const snapCursos = await getDocs(refCursos);
            snapCursos.forEach(d => {
                if (idsProcessados.has(d.id)) return;
                const data = d.data();
                if (data.excluido === true) return;
                turmasEcursos.push({ id: d.id, ...data });
            });
        } catch (eC) {}

        // 3. Monta o resultado individual e calcula as vagas livres REAIS
        const resultadoLotacao = [];
        let totalVagasDisponiveisReais = 0;
        let totalMatriculadosGerais = 0;
        let turmasLotadasContador = 0;

        turmasEcursos.forEach(item => {
            const idDoc = item.id;
            const nomeTurma = item.nome_turma || item.nome_curso || item.nome || item.titulo || "Turma sem nome";
            const nomeTurmaClean = nomeTurma.toLowerCase().trim();

            const vagasMaximas = Number(item.vagas_maximas || item.vagas || 20);

            // Pega o número exato de alunos cadastrados para esta turma
            const matId = contagemMatriculasPorId[idDoc] || 0;
            const matNome = contagemMatriculasPorNome[nomeTurmaClean] || 0;
            const matriculados = Math.max(matId, matNome);

            const vagasRestantes = Math.max(0, vagasMaximas - matriculados);

            // SOMA DIRETA: Acumula apenas as vagas livres exatas que sobraram em cada turma
            totalVagasDisponiveisReais += vagasRestantes;
            totalMatriculadosGerais += matriculados;

            if (vagasRestantes === 0) {
                turmasLotadasContador++;
            }

            // Recupera lista de alunos sem duplicações
            const alunos = alunosPorTurmaMap[idDoc] || alunosPorTurmaMap[nomeTurmaClean] || [];

            resultadoLotacao.push({
                id: idDoc,
                nome_turma: nomeTurma,
                horario: item.horario || "Horário flexível (Dias a definir)",
                instrutor: item.instrutor || item.professor || "Instrutor a definir",
                vagas_maximas: vagasMaximas,
                matriculados: matriculados,
                vagas_restantes: vagasRestantes,
                status_lotacao: vagasRestantes === 0 ? "Esgotado" : (vagasRestantes <= 3 ? "Quase Lotado" : "Disponível"),
                alunos: alunos
            });
        });

        return {
            turmas: resultadoLotacao,
            metricas: {
                turmasAtivas: resultadoLotacao.length,
                vagasDisponiveis: totalVagasDisponiveisReais, // Exibe o valor real exato descontado das matrículas
                turmasLotadas: turmasLotadasContador,
                totalMatriculados: totalMatriculadosGerais
            }
        };

    } catch (error) {
        console.error("Erro no cálculo de lotação:", error);
        throw error;
    }
}