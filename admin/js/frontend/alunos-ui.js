// ==========================================================================
// TRAINING WORK — UI DE ALUNOS
// ==========================================================================

import { notificar } from "../modules/notificacao.js";
import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import {
    collection,
    onSnapshot,
    collectionGroup,
    doc,
    updateDoc,
    deleteDoc,
    addDoc
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

console.log("✅ [alunos-ui] carregado");

let listaAlunos = [];
let matriculasPorAluno = {};
let iniciou = false;

/* ==========================================================================
 * AUTH
 * ========================================================================== */
onAuthStateChanged(auth, (user) => {
    if (!user) return;
    if (iniciou) return;
    iniciou = true;
    console.log("🚀 [alunos-ui] iniciando com", user.email);

    // Logout
    const btnLogout = document.getElementById("btnLogoutSidebar") || document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", async () => {
            await auth.signOut();
            window.location.replace("login.html");
        });
    }

    // Escuta alunos
    onSnapshot(collection(db, "alunos"), (snap) => {
        listaAlunos = [];
        snap.forEach(d => listaAlunos.push({ id: d.id, ...d.data() }));
        listaAlunos.sort((a, b) =>
            new Date(b.criado_em || 0) - new Date(a.criado_em || 0)
        );
        console.log("📥 [alunos-ui] Alunos recebidos:", listaAlunos.length);
        renderizar();
    }, (err) => {
        console.error("❌ [alunos-ui] onSnapshot alunos:", err);
    });

    // Escuta matrículas (subcoleção)
    onSnapshot(collectionGroup(db, "matriculas"), (snap) => {
        matriculasPorAluno = {};
        snap.forEach(d => {
            const turmaId = d.ref.parent.parent?.id;
            if (!turmaId) return;
            const m = d.data();
            const alunoId = m.aluno_id;
            if (!alunoId) return;
            if (!matriculasPorAluno[alunoId]) matriculasPorAluno[alunoId] = [];
            matriculasPorAluno[alunoId].push(m.curso_nome || "Geral");
        });
        renderizar();
    }, (err) => {
        console.warn("⚠️ [alunos-ui] onSnapshot matriculas:", err.message);
    });
});

/* ==========================================================================
 * RENDER
 * ========================================================================== */
function renderizar() {
    const tbody = document.getElementById("alunos-tbody");
    if (!tbody) return;

    const termo = (document.getElementById("inputBuscaAluno")?.value || "").toLowerCase().trim();

    // KPIs
    let ativos = 0, inativos = 0, debitos = 0;
    listaAlunos.forEach(a => {
        const s = (a.status || "ativo").toLowerCase();
        if (s === "ativo") ativos++;
        else if (s === "inativo") inativos++;
        if (s === "debito") debitos++;
    });

    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set("metric-total-alunos", listaAlunos.length);
    set("metric-alunos-ativos", ativos);
    set("metric-alunos-inativos", inativos);
    set("metric-alunos-debitos", debitos);

    // Filtro
    const filtrados = listaAlunos.filter(a =>
        (a.nome || "").toLowerCase().includes(termo) ||
        (a.email || "").toLowerCase().includes(termo)
    );

    if (filtrados.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum aluno encontrado.</td></tr>`;
        return;
    }

    let html = "";
    filtrados.forEach(aluno => {
        const cursos = matriculasPorAluno[aluno.id] || [];
        const cursosTags = cursos.length > 0
            ? cursos.map(c => `<span class="badge bg-light text-secondary border m-1">${c}</span>`).join(" ")
            : `<span class="text-muted small">Sem matrículas</span>`;

        const tel = (aluno.telefone || "").replace(/\D/g, "");
        const zapLink = tel ? `https://wa.me/55${tel}` : "#";

        const data = aluno.criado_em ? new Date(aluno.criado_em).toLocaleDateString("pt-BR") : "Recente";

        const statusAtual = (aluno.status || "ativo").toLowerCase();
        const badgeStatus = statusAtual === "inativo"
            ? `<span class="badge bg-secondary bg-opacity-10 text-secondary">Inativo</span>`
            : statusAtual === "debito"
                ? `<span class="badge bg-warning bg-opacity-10 text-warning">Em Débito</span>`
                : `<span class="badge bg-success bg-opacity-10 text-success">Ativo</span>`;

        html += `
            <tr>
                <td>
                    <div class="fw-bold text-dark">${aluno.nome || "Não informado"}</div>
                    <small class="text-muted d-block">${aluno.email || ""}</small>
                </td>
                <td class="d-none d-lg-table-cell">${aluno.telefone || "-"}</td>
                <td class="d-none d-lg-table-cell" style="max-width: 250px;">${cursosTags}</td>
                <td class="d-none d-lg-table-cell">${data}</td>
                <td>${badgeStatus}</td>
                <td class="text-end">
                    <div class="d-flex justify-content-end gap-1">
                        <a href="${zapLink}" target="_blank" class="btn btn-sm btn-outline-success px-2 py-1">
                            <i class="fab fa-whatsapp"></i>
                        </a>
                        <button class="btn btn-sm btn-outline-info px-2 py-1 btn-ficha" data-id="${aluno.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar" data-id="${aluno.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-danger px-2 py-1 btn-excluir" data-id="${aluno.id}">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* ==========================================================================
 * DELEGAÇÃO DE CLIQUES
 * ========================================================================== */
document.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const id = btn.dataset.id;
    if (!id) return;

    if (btn.classList.contains("btn-ficha")) {
        if (typeof window.abrirFichaAluno === "function") window.abrirFichaAluno(id);
        else notificar("Módulo de ficha não carregado.", "erro");
        return;
    }

    if (btn.classList.contains("btn-editar")) {
        const aluno = listaAlunos.find(a => a.id === id);
        if (!aluno) return;
        alert("Edição será reativada na próxima etapa.");
        return;
    }

    if (btn.classList.contains("btn-excluir")) {
        if (confirm("Excluir este aluno?")) {
            deleteDoc(doc(db, "alunos", id))
                .then(() => notificar("Aluno excluído.", "sucesso"))
                .catch(err => notificar("Erro ao excluir.", "erro"));
        }
        return;
    }
});

// Busca
document.addEventListener("DOMContentLoaded", () => {
    const busca = document.getElementById("inputBuscaAluno");
    if (busca) busca.addEventListener("input", renderizar);
});

console.log("✅ [alunos-ui] listeners registrados");