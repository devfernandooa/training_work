// ==========================================================================
// TRAINING WORK - SERVICE: MATRÍCULAS (M2 refatorado)
// ==========================================================================

import { db, auth } from "../firebase-config.js";
import {
    collection,
    collectionGroup,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { registrarAuditoriaGenerica, compararAlteracoes } from "./auditoria-service.js";

/* ==========================================================================
 * LISTAGEM
 * ========================================================================== */
export async function listarMatriculasService(opcoes = {}) {
    const incluirExcluidos = opcoes.incluirExcluidos === true;
    const lista = [];

    try {
        const turmasRef = collection(db, "turmas");
        const turmasSnap = await getDocs(turmasRef);

        for (const turmaDoc of turmasSnap.docs) {
            const turmaId = turmaDoc.id;
            const turmaData = turmaDoc.data();
            const nomeTurma = turmaData.nome_turma || turmaData.nome || turmaData.curso_nome || "Turma sem nome";

            const matriculasRef = collection(db, "turmas", turmaId, "matriculas");
            const matriculasSnap = await getDocs(matriculasRef);

            matriculasSnap.forEach(matDoc => {
                const data = matDoc.data();
                if (!incluirExcluidos && data.excluido === true) return;

                lista.push({
                    id: matDoc.id,
                    turmaId: turmaId,
                    aluno_id: data.aluno_id || "",
                    aluno_nome: data.aluno_nome || "Aluno não identificado",
                    aluno_email: data.aluno_email || "",
                    turma_nome: data.curso_nome || data.turma_nome || nomeTurma,
                    valor: Number(data.valor || 0),
                    forma_pagamento: data.forma_pagamento || "Pix",
                    status: data.status_matricula || data.status || "confirmada",
                    excluido: data.excluido === true,
                    criado_em: data.criado_em || "",
                    atualizado_em: data.ultima_alteracao_em || data.atualizado_em || ""
                });
            });
        }

        lista.sort((a, b) => (b.criado_em || "").localeCompare(a.criado_em || ""));
        return lista;
    } catch (error) {
        console.error("Erro ao listar matrículas:", error);
        throw error;
    }
}

/* ==========================================================================
 * VALIDAÇÃO DE VAGA
 * ========================================================================== */
async function validarVagaTurma(turmaId, matriculaIdIgnorar = null) {
    if (!turmaId) return;

    const turmaRef = doc(db, "turmas", turmaId);
    const turmaSnap = await getDoc(turmaRef);
    if (!turmaSnap.exists()) throw new Error("Turma não encontrada.");

    const vagasMaximas = Number(turmaSnap.data().vagas_maximas || 20);
    const refMatriculas = collection(db, "turmas", turmaId, "matriculas");
    const snap = await getDocs(refMatriculas);

    let ocupadas = 0;
    snap.forEach(d => {
        const m = d.data();
        if (d.id === matriculaIdIgnorar) return;
        if (m.excluido === true) return;

        const statusLower = String(m.status_matricula || m.status || "").toLowerCase();
        const isAtivo = statusLower.includes("confirmad") || statusLower.includes("pago") || statusLower.includes("recebido");
        if (isAtivo) ocupadas++;
    });

    if (ocupadas >= vagasMaximas) {
        throw new Error(`A turma selecionada já atinge o limite de ${vagasMaximas} vagas.`);
    }
}
/* ==========================================================================
 * VALIDAÇÃO: ALUNO JÁ MATRICULADO NESTE CURSO?
 * ========================================================================== */
async function validarDuplicidadeCurso(alunoId, cursoNome, matriculaIdIgnorar = null) {
    if (!alunoId || !cursoNome) return;

    const turmasSnap = await getDocs(collection(db, "turmas"));
    const nomeCursoLimpo = cursoNome.trim().toLowerCase();

    for (const turmaDoc of turmasSnap.docs) {
        const turmaData = turmaDoc.data();
        const nomeTurma = turmaData.nome_turma || turmaData.nome || turmaData.curso_nome || "";

        // Se o nome da turma bate com o curso (ou vice-versa)
        const mesmaTurmaCurso = nomeTurma.toLowerCase().includes(nomeCursoLimpo) || nomeCursoLimpo.includes(nomeTurma.toLowerCase());

        if (mesmaTurmaCurso) {
            const matriculasSnap = await getDocs(collection(db, "turmas", turmaDoc.id, "matriculas"));

            let jaMatriculado = false;
            matriculasSnap.forEach(d => {
                const m = d.data();
                if (d.id === matriculaIdIgnorar) return;
                if (m.excluido === true) return;

                if (m.aluno_id === alunoId) jaMatriculado = true;
            });

            if (jaMatriculado) {
                throw new Error(`Este aluno já está matriculado no curso "${nomeTurma}".`);
            }
        }
    }
}
/* ==========================================================================
 * CRIAR
 * ========================================================================== */
export async function criarMatriculaService(dadosMatricula) {
    const turmaId = dadosMatricula.turma_id;
    if (!turmaId) throw new Error("Selecione uma turma.");

    await validarVagaTurma(turmaId);
    await validarDuplicidadeCurso(dadosMatricula.aluno_id, dadosMatricula.turma_nome);

    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    const novaMatricula = {
        aluno_id: dadosMatricula.aluno_id,
        aluno_nome: dadosMatricula.aluno_nome,
        aluno_email: dadosMatricula.aluno_email || "",
        turma_id: turmaId,
        curso_nome: dadosMatricula.turma_nome || "",
        valor: String(dadosMatricula.valor || "0.00"),
        forma_pagamento: dadosMatricula.forma_pagamento || "Pix",
        status_matricula: dadosMatricula.status || "confirmada",
        status_pagamento: "Recebido (Pago)",
        criado_em: agora,
        atualizado_em: agora,
        atualizado_por: adminEmail,
        excluido: false
    };

    try {
        const ref = collection(db, "turmas", turmaId, "matriculas");
        const docRef = await addDoc(ref, novaMatricula);

        await registrarAuditoriaGenerica("turmas", turmaId, {
            tipo: "criacao_matricula",
            entidade: "matricula",
            descricao: `Matrícula criada: ${novaMatricula.aluno_nome}`,
            campos_alterados: []
        });

        return { id: docRef.id, ...novaMatricula };
    } catch (error) {
        console.error("Erro ao criar matrícula:", error);
        throw error;
    }
}

/* ==========================================================================
 * ATUALIZAR
 * ========================================================================== */
export async function atualizarMatriculaService(id, turmaId, dados) {
    if (!id || !turmaId) throw new Error("Parâmetros inválidos.");

    await validarVagaTurma(turmaId, id);
    if (dados.turma_nome) {
        await validarDuplicidadeCurso(dados.aluno_id, dados.turma_nome, id);
    }
    const refDoc = doc(db, "turmas", turmaId, "matriculas", id);
    const snapAntes = await getDoc(refDoc);
    const antes = snapAntes.exists() ? snapAntes.data() : {};

    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    const camposAtualizacao = {
        valor: dados.valor !== undefined ? String(dados.valor) : antes.valor,
        forma_pagamento: dados.forma_pagamento || antes.forma_pagamento,
        status_matricula: dados.status || antes.status_matricula,
        atualizado_em: agora,
        atualizado_por: adminEmail
    };

    if (dados.turma_nome) camposAtualizacao.curso_nome = dados.turma_nome;

    try {
        await updateDoc(refDoc, camposAtualizacao);

        const camposAlterados = compararAlteracoes(antes, camposAtualizacao);
        if (camposAlterados.length > 0) {
            await registrarAuditoriaGenerica("turmas", turmaId, {
                tipo: "alteracao_matricula",
                entidade: "matricula",
                descricao: `Matrícula de ${antes.aluno_nome || "aluno"} alterada`,
                campos_alterados: camposAlterados
            });
        }

        return true;
    } catch (error) {
        console.error("Erro ao atualizar matrícula:", error);
        throw error;
    }
}

/* ==========================================================================
 * EXCLUIR / RESTAURAR
 * ========================================================================== */
export async function excluirMatriculaService(id, turmaId) {
    if (!id || !turmaId) throw new Error("Parâmetros inválidos.");

    const refDoc = doc(db, "turmas", turmaId, "matriculas", id);
    const snap = await getDoc(refDoc);
    if (!snap.exists()) throw new Error("Matrícula não encontrada.");

    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    await updateDoc(refDoc, {
        excluido: true,
        excluido_em: agora,
        excluido_por: adminEmail,
        atualizado_em: agora,
        atualizado_por: adminEmail
    });

    await registrarAuditoriaGenerica("turmas", turmaId, {
        tipo: "exclusao_matricula",
        entidade: "matricula",
        descricao: `Matrícula de ${snap.data().aluno_nome || "aluno"} excluída`,
        campos_alterados: []
    });

    return true;
}

export async function restaurarMatriculaService(id, turmaId) {
    if (!id || !turmaId) throw new Error("Parâmetros inválidos.");

    const refDoc = doc(db, "turmas", turmaId, "matriculas", id);
    const adminEmail = auth?.currentUser?.email || "Sistema";
    const agora = new Date().toISOString();

    await updateDoc(refDoc, {
        excluido: false,
        excluido_em: null,
        excluido_por: null,
        atualizado_em: agora,
        atualizado_por: adminEmail
    });

    await registrarAuditoriaGenerica("turmas", turmaId, {
        tipo: "restauracao_matricula",
        entidade: "matricula",
        descricao: `Matrícula restaurada`,
        campos_alterados: []
    });

    return true;
}

/* ==========================================================================
 * AUXILIARES
 * ========================================================================== */
export async function obterAlunosParaMatriculaService() {
    try {
        const snap = await getDocs(collection(db, "alunos"));
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
    const turmas = [];
    try {
        const snap = await getDocs(collection(db, "turmas"));
        snap.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            const nome = data.nome_turma || data.nome || data.titulo || data.curso_nome || "Turma sem nome";
            turmas.push({ id: d.id, nome_turma: nome, valor: Number(data.valor || data.preco || 0) });
        });
        return turmas;
    } catch (e) {
        console.warn("Erro ao carregar turmas:", e);
        return [];
    }
}

export async function listarMatriculasDaTurma(turmaId) {
    if (!turmaId) return [];
    try {
        const ref = collection(db, "turmas", turmaId, "matriculas");
        const snap = await getDocs(ref);
        const lista = [];
        snap.forEach(d => {
            const data = d.data();
            if (data.excluido === true) return;
            lista.push({ id: d.id, ...data });
        });
        return lista;
    } catch (error) {
        console.error("Erro ao listar matrículas da turma:", error);
        return [];
    }
}