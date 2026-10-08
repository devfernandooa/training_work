// ==========================================================================
// TRAINING WORK - SERVICE (BACKEND): CATÁLOGO DE CURSOS & TREINAMENTOS
// ==========================================================================
import { auth, db } from "../firebase-config.js";
import {
    collection,
    onSnapshot,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/**
 * Escuta em tempo real a coleção de cursos ativos no Firestore.
 */
export function escutarCursosService(callback) {
    const colRef = collection(db, "cursos");

    return onSnapshot(colRef, (snapshot) => {
        const lista = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.excluido) {
                lista.push({ id: docSnap.id, ...data });
            }
        });

        lista.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

        callback(lista);
    }, (error) => {
        console.error("Erro ao escutar cursos no Firestore:", error);
    });
}

/**
 * Recupe os detalhes de um curso específico pelo ID.
 */
export async function obterCursoPorIdService(id) {
    try {
        const docRef = doc(db, "cursos", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        console.error("Erro ao obter curso:", error);
        throw error;
    }
}

/**
 * Formata a nomenclatura padrão de turma: TR-[CODIGO_CURSO]-[ANO]/[SEQUENCIAL]
 */
export function gerarCodigoTurmaFormatado(codigoCurso, ano = 2026, sequencial = 1) {
    const codLimpo = String(codigoCurso || "GERAL").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    const seqFmt = String(sequencial).padStart(3, "0");
    return `TR-${codLimpo}-${ano}/${seqFmt}`;
}

/**
 * Persiste ou atualiza o registro de um curso/turma no Firestore.
 */
export async function salvarCursoService(dadosCurso, idCurso = null) {
    const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
    const dataHoraAtual = new Date().toISOString();

    const codigoCursoBase = String(dadosCurso.codigo || dadosCurso.codigo_curso || "").trim().toUpperCase();

    if (!codigoCursoBase) {
        throw new Error("O código do curso (ex: GPN-03, NR-06) é obrigatório.");
    }

    const anoAtual = new Date().getFullYear();

    let codigoTurmaFinal = String(dadosCurso.codigo_turma || dadosCurso.numero_turma || "").trim().toUpperCase();

    if (!codigoTurmaFinal || codigoTurmaFinal === codigoCursoBase) {
        const seq = dadosCurso.sequencialTurma || 1;
        codigoTurmaFinal = gerarCodigoTurmaFormatado(codigoCursoBase, anoAtual, seq);
    }

    const objetoCurso = {
        nome: dadosCurso.nome || "",
        codigo: codigoCursoBase,
        codigo_curso: codigoCursoBase,
        numero_turma: codigoTurmaFinal,
        codigo_turma: codigoTurmaFinal,
        carga: dadosCurso.carga || "0",
        valor: Number(dadosCurso.valor || 0),
        modalidade: dadosCurso.modalidade || "Presencial",
        status: dadosCurso.status || "Ativo",
        secaoExibicao: dadosCurso.secaoExibicao || "grade",
        vagasTotal: Number(dadosCurso.vagasTotal || 0),
        vagasDisponiveis: Number(dadosCurso.vagasDisponiveis || 0),
        instrutor: dadosCurso.instrutor || "A definir",
        descricao: dadosCurso.descricao || "",
        ementa: dadosCurso.ementa || "",
        atualizado_por: adminEmail,
        atualizado_em: dataHoraAtual
    };

    if (idCurso) {
        const refDoc = doc(db, "cursos", idCurso);
        await updateDoc(refDoc, objetoCurso);
        return { id: idCurso, ...objetoCurso };
    } else {
        objetoCurso.criado_em = dataHoraAtual;
        objetoCurso.excluido = false;
        const docRef = await addDoc(collection(db, "cursos"), objetoCurso);
        return { id: docRef.id, ...objetoCurso };
    }
}

/**
 * Executa a inativação lógica de um curso mantendo o histórico de auditoria.
 */
export async function inativarCursoService(idCurso) {
    try {
        const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
        const docRef = doc(db, "cursos", idCurso);

        await updateDoc(docRef, {
            excluido: true,
            atualizado_por: adminEmail,
            atualizado_em: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error("Erro ao inativar curso:", error);
        throw error;
    }
}