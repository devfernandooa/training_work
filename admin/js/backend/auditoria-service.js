import { auth, db } from "../firebase-config.js";
import {
    collection,
    addDoc,
    getDocs,
    orderBy,
    query,
    limit
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("✅ auditoria-service.js carregado");

export function compararAlteracoes(antes = {}, depois = {}) {
    const alteracoes = [];
    const ignorar = ["atualizado_em", "atualizado_por", "id", "endereco"];

    Object.keys(depois).forEach(campo => {
        if (ignorar.includes(campo)) return;
        if (campo === "endereco") return;
        const a = antes[campo];
        const b = depois[campo];
        if (JSON.stringify(a) !== JSON.stringify(b)) {
            alteracoes.push({ campo, valor_anterior: a ?? null, valor_novo: b ?? null });
        }
    });

    if (depois.endereco) {
        const ea = antes.endereco || {};
        Object.keys(depois.endereco).forEach(k => {
            if (JSON.stringify(ea[k]) !== JSON.stringify(depois.endereco[k])) {
                alteracoes.push({
                    campo: `endereco.${k}`,
                    valor_anterior: ea[k] ?? null,
                    valor_novo: depois.endereco[k] ?? null
                });
            }
        });
    }

    return alteracoes;
}

export async function registrarAuditoriaAluno(alunoId, dados) {
    if (!alunoId) throw new Error("ID obrigatório");
    const adminEmail = auth?.currentUser?.email || "Sistema";
    const payload = {
        tipo: dados.tipo || "alteracao",
        entidade: dados.entidade || "aluno",
        descricao: dados.descricao || "Alteração",
        campos_alterados: dados.campos_alterados || [],
        admin_email: adminEmail,
        criado_em: new Date().toISOString()
    };
    const ref = collection(db, "alunos", alunoId, "auditoria");
    const d = await addDoc(ref, payload);
    return { id: d.id, ...payload };
}

export async function listarAuditoriaAluno(alunoId, limite = 20) {
    const ref = collection(db, "alunos", alunoId, "auditoria");
    const q = query(ref, orderBy("criado_em", "desc"), limit(limite));
    const snap = await getDocs(q);
    const logs = [];
    snap.forEach(d => logs.push({ id: d.id, ...d.data() }));
    return logs;
}