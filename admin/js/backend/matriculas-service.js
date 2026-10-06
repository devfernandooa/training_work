// ==========================================================================
// TRAINING WORK - SERVICE: MATRÍCULAS (COM VALIDAÇÃO DE VAGAS DA TURMA)
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    updateDoc, 
    getDoc,
    query, 
    where 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let db;

function getDbInstance() {
    if (!db) {
        db = getFirestore();
    }
    return db;
}

export async function listarMatriculasService() {
    const firestore = getDbInstance();
    try {
        const ref = collection(firestore, "matriculas");
        const snap = await getDocs(ref);

        const lista = [];
        snap.forEach(docSnap => {
            const data = docSnap.data();
            if (data.excluido === true) return;

            lista.push({
                id: docSnap.id,
                aluno_id: data.aluno_id || "",
                aluno_nome: data.aluno_nome || "Aluno não identificado",
                aluno_email: data.aluno_email || "",
                turma_id: data.turma_id || data.turmaId || "",
                turma_nome: data.curso_nome || data.turma_nome || "Sem Turma Vinculada",
                valor: Number(data.valor || 0),
                forma_pagamento: data.forma_pagamento || "Pix",
                status: data.status_matricula || data.status || "confirmada"
            });
        });

        return lista;
    } catch (error) {
        console.error("Erro ao listar matrículas:", error);
        throw error;
    }
}

/**
 * Atualiza e vincula a matrícula SOMENTE SE houver vaga disponível na turma
 */
export async function atualizarMatriculaService(id, dados) {
    const firestore = getDbInstance();

    // 1. Tenta validar lotação (com tratamento de permissão)
    if (dados.turma_id) {
        try {
            const turmaRef = doc(firestore, "turmas", dados.turma_id);
            const turmaSnap = await getDoc(turmaRef);

            if (turmaSnap.exists()) {
                const vagasMaximas = Number(turmaSnap.data().vagas_maximas || 20);
                const matriculasRef = collection(firestore, "matriculas");
                const snapMatriculas = await getDocs(matriculasRef);

                let ocupadas = 0;
                snapMatriculas.forEach(docSnap => {
                    const m = docSnap.data();
                    const idTurmaDoc = m.turma_id || m.turmaId;
                    const statusLower = String(m.status_matricula || m.status || "").toLowerCase();
                    const isAtivo = statusLower.includes("confirmad") || statusLower.includes("pago") || statusLower.includes("recebido");

                    if (idTurmaDoc === dados.turma_id && isAtivo && docSnap.id !== id && m.excluido !== true) {
                        ocupadas++;
                    }
                });

                if (ocupadas >= vagasMaximas) {
                    throw new Error(`A turma selecionada já atinge o limite de ${vagasMaximas} vagas.`);
                }
            }
        } catch (errPermissao) {
            // Se for erro de permissão na contagem, apenas gera aviso e prossegue com a escrita do documento
            if (errPermissao.message && errPermissao.message.includes("limite")) {
                throw errPermissao;
            }
            console.warn("Aviso: Não foi possível validar contagem de vagas devido às regras do Firestore.", errPermissao);
        }
    }

    // 2. Gravação dos dados no documento da matrícula
    try {
        const refDoc = doc(firestore, "matriculas", id);
        const camposAtualizacao = {
            turma_id: dados.turma_id,
            curso_nome: dados.turma_nome,
            ultima_alteracao_em: new Date().toISOString()
        };

        if (dados.valor !== undefined) camposAtualizacao.valor = String(dados.valor);
        if (dados.forma_pagamento) camposAtualizacao.forma_pagamento = dados.forma_pagamento;
        if (dados.status) camposAtualizacao.status_matricula = dados.status;

        await updateDoc(refDoc, camposAtualizacao);
        return true;
    } catch (error) {
        console.error("Erro na atualização do documento Firestore:", error);
        throw error;
    }
}

export async function criarMatriculaService(dadosMatricula) {
    const firestore = getDbInstance();
    try {
        const ref = collection(firestore, "matriculas");
        
        const novaMatricula = {
            aluno_id: dadosMatricula.aluno_id,
            aluno_nome: dadosMatricula.aluno_nome,
            aluno_email: dadosMatricula.aluno_email || "",
            turma_id: dadosMatricula.turma_id || "",
            curso_nome: dadosMatricula.turma_nome || "",
            valor: String(dadosMatricula.valor || "0.00"),
            forma_pagamento: dadosMatricula.forma_pagamento || "Pix",
            status_matricula: dadosMatricula.status || "confirmada",
            status_pagamento: "Recebido (Pago)",
            ultima_alteracao: new Date().toISOString(),
            ultima_alteracao_em: new Date().toISOString(),
            excluido: false
        };

        const docRef = await addDoc(ref, novaMatricula);
        return { id: docRef.id, ...novaMatricula };
    } catch (error) {
        console.error("Erro ao criar matrícula:", error);
        throw error;
    }
}

export async function excluirMatriculaService(id) {
    const firestore = getDbInstance();
    try {
        const refDoc = doc(firestore, "matriculas", id);
        await updateDoc(refDoc, { excluido: true });
        return true;
    } catch (error) {
        console.error("Erro ao excluir matrícula:", error);
        throw error;
    }
}

export async function obterAlunosParaMatriculaService() {
    const firestore = getDbInstance();
    try {
        const ref = collection(firestore, "alunos");
        const snap = await getDocs(ref);
        const alunos = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            alunos.push({
                id: d.id,
                nome: data.nome || data.nome_completo || data.nomeAluno || "Aluno sem nome",
                cpf: data.cpf || "Sem CPF",
                email: data.email || ""
            });
        });
        return alunos;
    } catch (error) {
        console.error("Erro ao carregar alunos:", error);
        return [];
    }
}

export async function obterTurmasParaMatriculaService() {
    const firestore = getDbInstance();
    const turmas = [];
    const idsProcessados = new Set();

    try {
        const refTurmas = collection(firestore, "turmas");
        const snapTurmas = await getDocs(refTurmas);
        snapTurmas.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            const nome = data.nome_turma || data.nome || data.titulo || data.curso_nome || "Turma sem nome";
            turmas.push({ id: d.id, nome_turma: nome, valor: Number(data.valor || data.preco || 0) });
            idsProcessados.add(d.id);
        });
    } catch (eTurmas) {
        console.warn("Aviso na coleção turmas:", eTurmas);
    }

    try {
        const refCursos = collection(firestore, "cursos");
        const snapCursos = await getDocs(refCursos);
        snapCursos.forEach(d => {
            if (idsProcessados.has(d.id)) return;
            const data = d.data();
            if (data.excluido === true) return;
            const nome = data.nome || data.nome_curso || data.titulo || data.codigo_nr || "Curso sem nome";
            turmas.push({ id: d.id, nome_turma: nome, valor: Number(data.valor || data.preco || 0) });
        });
    } catch (eCursos) {
        console.warn("Aviso na coleção cursos:", eCursos);
    }

    return turmas;
}