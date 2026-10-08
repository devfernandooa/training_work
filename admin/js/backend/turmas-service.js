/**
 * =========================================================================
 * TRAINING WORK - SERVIÇO BACKEND DE TURMAS (turmas-service.js)
 * =========================================================================
 * Camada de serviço responsável pela comunicação com a coleção /turmas
 * do Firestore: consultas em tempo real, gravações e alterações de status.
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    addDoc,
    deleteDoc,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js"

const NOME_COLECAO = "turmas";

/* ==========================================================================
 * ESCUTA EM TEMPO REAL
 * ========================================================================== */

/**
 * Escuta em tempo real todas as turmas cadastradas na coleção /turmas.
 * @param {Function} callback - Recebe o array de turmas
 * @returns {Function} unsubscribe
 */


export function escutarTurmas(callback) {
    const refColecao = collection(db, NOME_COLECAO);

    let unsubscribe = null;

    // ⚡ Só conecta ao Firestore DEPOIS que o usuário está logado
    // e o token está pronto.
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) return;

        // Garante que o token está pronto
        await user.getIdToken(true);

        // Se já está escutando, ignora
        if (unsubscribe) return;

        // Agora sim, conecta ao Firestore
        unsubscribe = onSnapshot(refColecao, (snapshot) => {
            const turmas = [];
            snapshot.forEach((docSnap) => {
                turmas.push({ id: docSnap.id, ...docSnap.data() });
            });
            if (typeof callback === "function") callback(turmas);
        }, (erro) => {
            console.error("❌ Erro ao escutar /turmas:", erro);
            if (typeof callback === "function") callback([]);
        });
    });

    // Retorna uma função que cancela ambos
    return () => {
        unsubAuth();
        if (unsubscribe) unsubscribe();
    };
}

/* ==========================================================================
 * LEITURA PONTUAL
 * ========================================================================== */

export async function obterTurmasBackend() {
    try {
        const snapshot = await getDocs(collection(db, NOME_COLECAO));
        const turmas = [];
        snapshot.forEach((docSnap) => {
            turmas.push({ id: docSnap.id, ...docSnap.data() });
        });
        return turmas;
    } catch (erro) {
        console.error("❌ Erro ao obter turmas:", erro);
        throw erro;
    }
}

/* ==========================================================================
 * ESCRITA
 * ========================================================================== */

/**
 * Cria ou atualiza um documento de turma em /turmas.
 * @param {Object} dadosTurma
 * @param {string|null} turmaId - ID para edição, null para criação
 * @returns {Promise<string>} ID da turma gravada
 */
export async function salvarTurmaBackend(dadosTurma, turmaId = null) {
    try {
        const usuarioLogado = auth?.currentUser?.email || "Sistema";
        const timestamp = new Date().toISOString();

        const payload = {
            ...dadosTurma,
            atualizado_em: timestamp,
            atualizado_por: usuarioLogado
        };

        let idFinal;

        if (turmaId) {
            // EDIÇÃO
            idFinal = turmaId;
            const refDoc = doc(db, NOME_COLECAO, turmaId);
            await updateDoc(refDoc, payload);
            //console.log(`✏️ Turma ${turmaId} atualizada.`);
        } else {
            // CRIAÇÃO
            payload.criado_em = timestamp;
            payload.criado_por = usuarioLogado;
            payload.status = payload.status || "Ativo";
            payload.alunos_matriculados = payload.alunos_matriculados || [];

            const refNova = await addDoc(collection(db, NOME_COLECAO), payload);
            idFinal = refNova.id;
            //console.log(`✅ Turma ${idFinal} criada.`);
        }

        return idFinal;
    } catch (erro) {
        console.error("❌ Erro ao salvar turma:", erro);
        throw erro;
    }
}

/**
 * Alterna o status entre "Ativo" e "Inativo".
 */
export async function alternarStatusTurmaBackend(turmaId, novoStatus) {
    try {
        const refDoc = doc(db, NOME_COLECAO, turmaId);
        await updateDoc(refDoc, {
            status: novoStatus,
            atualizado_em: new Date().toISOString()
        });
        ////console.log(`🔄 Turma ${turmaId} → ${novoStatus}`);
    } catch (erro) {
        console.error("❌ Erro ao alternar status:", erro);
        throw erro;
    }
}

export async function matricularAlunoNaTurmaBackend(turmaId, aluno) {
    try {
        const alunoId = aluno.id || aluno.aluno_id;

        // 1. Cria doc na subcoleção /matriculas
        await setDoc(
            doc(db, "turmas", turmaId, "matriculas", alunoId),
            {
                aluno_id: alunoId,
                aluno_nome: aluno.nome || aluno.nome_aluno || "",
                aluno_email: aluno.email || "",
                data_matricula: new Date().toISOString(),
                status: "Matriculado"
            }
        );

        // 2. Atualiza array dentro da turma
        const refTurma = doc(db, "turmas", turmaId);
        const snapTurma = await getDocs(query(collection(db, "turmas"), where("__name__", "==", turmaId)));

        let turmaAtual = null;
        snapTurma.forEach((d) => { turmaAtual = { id: d.id, ...d.data() }; });

        if (turmaAtual) {
            const matriculados = Array.isArray(turmaAtual.alunos_matriculados)
                ? [...turmaAtual.alunos_matriculados]
                : [];

            const jaExiste = matriculados.some((m) => (m.aluno_id || m.id) === alunoId);
            if (jaExiste) throw new Error("Aluno já matriculado nesta turma.");

            matriculados.push({
                aluno_id: alunoId,
                data_matricula: new Date().toISOString(),
                status: "Matriculado"
            });

            await updateDoc(refTurma, {
                alunos_matriculados: matriculados,
                vagas_ocupadas: matriculados.length,
                atualizado_em: new Date().toISOString()
            });
        }

        //console.log(`✅ Aluno ${alunoId} matriculado na turma ${turmaId}.`);
    } catch (erro) {
        console.error("❌ Erro ao matricular aluno:", erro);
        throw erro;
    }
}

export async function removerAlunoDaTurmaBackend(turmaId, alunoId) {
    try {
        // 1. Remove doc da subcoleção /matriculas
        await deleteDoc(doc(db, "turmas", turmaId, "matriculas", alunoId));

        // 2. Atualiza array na turma
        const refTurma = doc(db, "turmas", turmaId);
        const snapTurma = await getDocs(query(collection(db, "turmas"), where("__name__", "==", turmaId)));

        let turmaAtual = null;
        snapTurma.forEach((d) => { turmaAtual = { id: d.id, ...d.data() }; });
        if (!turmaAtual) throw new Error("Turma não encontrada.");

        const matriculados = (turmaAtual.alunos_matriculados || []).filter(
            (m) => (m.aluno_id || m.id) !== alunoId
        );

        await updateDoc(refTurma, {
            alunos_matriculados: matriculados,
            vagas_ocupadas: matriculados.length,
            atualizado_em: new Date().toISOString()
        });

       // //console.log(`🗑️ Aluno ${alunoId} removido da turma ${turmaId}.`);
    } catch (erro) {
        console.error("❌ Erro ao remover aluno:", erro);
        throw erro;
    }
}

/* ==========================================================================
 * HELPERS DE APRESENTAÇÃO
 * ========================================================================== */

/**
 * Retorna o nome de exibição de uma turma.
 * Formato: "APELIDO (CÓDIGO_TURMA)"
 * Exemplo: "GPON (TRW-GPN01-2026/001)"
 */
export function nomeExibicaoTurma(turma) {
    if (!turma) return "Turma";
    if (turma.nome_exibicao) return turma.nome_exibicao;

    const apelido = turma.curso_apelido || turma.apelido || "";
    const codigo = turma.codigo_turma || turma.id || "";
    const nomeCurto = turma.curso_nome
        ? turma.curso_nome.split(/[-–—:]/)[0].trim()
        : "";

    const parteNome = apelido || nomeCurto || "Curso";
    return codigo ? `${parteNome} (${codigo})` : parteNome;
}