import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let listaCursos = [];
let cursoIdParaExcluir = null;
let excluirModalInstance = null;
let cursoModalInstance = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  escutarCursos();
});

// Sincronização em tempo real dos Cursos via Firestore
function escutarCursos() {
  const colRef = collection(db, "cursos");

  onSnapshot(colRef, (snapshot) => {
    listaCursos = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.excluido) {
        listaCursos.push({ id: docSnap.id, ...data });
      }
    });

    // Ordenação alfabética pelo nome do curso
    listaCursos.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));

    atualizarMetricas(listaCursos);
    renderizarTabelaCursos(listaCursos);
  }, (error) => {
    console.error("Erro ao carregar cursos:", error);
  });
}

// Atualiza os cartões de métricas superiores
function atualizarMetricas(cursos) {
  const total = cursos.length;
  let turmasAbertas = 0;
  let ativos = 0;

  cursos.forEach(c => {
    const status = (c.status || "").toLowerCase();
    if (status === "turma aberta") turmasAbertas++;
    if (status === "ativo" || status === "em andamento") ativos++;
  });

  const elTotal = document.getElementById("metric-total-cursos");
  const elTurmas = document.getElementById("metric-turmas-abertas");
  const elAtivos = document.getElementById("metric-ativos");

  if (elTotal) elTotal.textContent = total;
  if (elTurmas) elTurmas.textContent = turmasAbertas;
  if (elAtivos) elAtivos.textContent = ativos;
}

// Renderização da tabela (desktop) e cartões (mobile)
function renderizarTabelaCursos(cursos) {
  const tbody = document.getElementById("cursos-tbody");
  const mobileContainer = document.getElementById("cursos-mobile-container");
  const inputBusca = document.getElementById("busca-curso");
  const termoBusca = inputBusca ? inputBusca.value.toLowerCase() : "";

  if (!tbody) return;

  const filtrados = cursos.filter(c => {
    const nome = (c.nome || "").toLowerCase();
    const codigo = (c.codigo || "").toLowerCase();
    return nome.includes(termoBusca) || codigo.includes(termoBusca);
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</td></tr>`;
    if (mobileContainer) mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</div>`;
    return;
  }

  let htmlDesktop = "";
  let htmlMobile = "";

  filtrados.forEach((curso, index) => {
    // Numeração de turma padronizada (ex: TR-2026-001)
    const numeroTurma = curso.numero_turma || `TR-2026-${String(index + 1).padStart(3, '0')}`;
    const status = (curso.status || "Ativo").toLowerCase();

    // Badges de status customizados por estado operacional
    let statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;"; // Ativo (Verde)
    let statusLabel = curso.status || "Ativo";

    if (status === "em andamento") {
      statusStyle = "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;"; // Azul
    } else if (status === "turma aberta") {
      statusStyle = "border: 1px solid #10b981; color: #047857; background: #ecfdf5;"; // Verde claro
    } else if (status === "finalizado") {
      statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;"; // Cinza
    } else if (status === "turma lotada") {
      statusStyle = "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;"; // Laranja
    }

    const statusPill = `<span class="px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${statusLabel}</span>`;

    // Botões de ação padronizados idênticos ao Dashboard
    const acoesBotoes = `
      <div style="display: inline-flex; gap: 0.4rem; justify-content: center;">
        <button onclick="abrirModalEditarCurso('${curso.id}')" class="btn-icon btn-icon-edit" title="Editar Curso">
          <i class="fas fa-pen"></i>
        </button>
        <button onclick="iniciarExclusaoCurso('${curso.id}')" class="btn-icon btn-icon-delete" title="Inativar Curso">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;

    // Linha Desktop
    htmlDesktop += `
      <tr>
        <td>
          <span class="fw-bold text-dark">${numeroTurma}</span><br>
          <small class="text-muted">${curso.codigo || '-'}</small>
        </td>
        <td>
          <strong>${curso.nome || "Não informado"}</strong><br>
          <small class="text-muted">${curso.instrutor || "A definir"}</small>
        </td>
        <td>${curso.carga || "0"} horas</td>
        <td>R$ ${Number(curso.valor || 0).toFixed(2)}</td>
        <td>${curso.modalidade || "Presencial"}</td>
        <td>${statusPill}</td>
        <td style="text-align: right;">${acoesBotoes}</td>
      </tr>
    `;

    // Cartão Mobile
    htmlMobile += `
      <div class="card bg-white border-0 shadow-sm p-3 mb-3 rounded-3">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div>
            <span class="badge bg-secondary mb-1">${numeroTurma}</span>
            <h6 class="fw-bold mb-0">${curso.nome || "Não informado"}</h6>
            <small class="text-muted">${curso.instrutor || "A definir"}</small>
          </div>
          <div>${statusPill}</div>
        </div>
        <div class="small text-muted mb-2">
          <div><strong>Carga:</strong> ${curso.carga || "0"}h | <strong>Investimento:</strong> R$ ${Number(curso.valor || 0).toFixed(2)}</div>
          <div><strong>Modalidade:</strong> ${curso.modalidade || "Presencial"}</div>
        </div>
        <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-2">
          <small class="text-muted font-monospace">${curso.codigo || ''}</small>
          <div>${acoesBotoes}</div>
        </div>
      </div>
    `;
  });

  tbody.innerHTML = htmlDesktop;
  if (mobileContainer) mobileContainer.innerHTML = htmlMobile;
}

// Filtro em tempo real de busca de curso
const inputBusca = document.getElementById("busca-curso");
if (inputBusca) {
  inputBusca.addEventListener("input", () => {
    renderizarTabelaCursos(listaCursos);
  });
}