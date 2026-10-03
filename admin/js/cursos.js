import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import "https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js";

/* ==========================================================================
 * VARIÁVEIS GLOBAIS E CONTROLO DE SESSÃO
 * ========================================================================== */

let listaCursos = [];
let cursoIdParaExcluir = null;
let cursoModalInstance = null;

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }
  escutarCursos();
});


/* ==========================================================================
 * SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
 * ========================================================================== */

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


/* ==========================================================================
 * ATUALIZAÇÃO DOS CARTÕES DE MÉTRICAS SUPERIORES
 * ========================================================================== */

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


/* ==========================================================================
 * RENDERIZAÇÃO DA TABELA (DESKTOP) E DOS CARTÕES (MOBILE)
 * ========================================================================== */

function capitalizarPrimeiraLetra(string) {
  if (!string) return "Ativo";
  const str = string.toLowerCase();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
    tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</td></tr>`;
    if (mobileContainer) {
      mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum curso encontrado.</div>`;
    }
    return;
  }

  let htmlDesktop = "";
  let htmlMobile = "";

  filtrados.forEach((curso, index) => {
    const numeroTurma = curso.numero_turma || `TR-2026-${String(index + 1).padStart(3, '0')}`;
    const statusBruto = (curso.status || "Ativo").toLowerCase();
    const statusLabel = capitalizarPrimeiraLetra(curso.status || "Ativo");

    let statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;"; // Ativo (Verde)

    if (statusBruto === "em andamento") {
      statusStyle = "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;"; // Azul
    } else if (statusBruto === "turma aberta") {
      statusStyle = "border: 1px solid #10b981; color: #047857; background: #ecfdf5;"; // Verde claro
    } else if (statusBruto === "finalizado") {
      statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;"; // Cinza
    } else if (statusBruto === "turma lotada") {
      statusStyle = "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;"; // Laranja
    }

    const statusPill = `<span class="px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${statusLabel}</span>`;

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

    // Linha Desktop com coluna de Vagas dedicada
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
        <td>
          <span class="fw-semibold text-dark">${curso.vagasDisponiveis ?? '-'}</span> 
          <small class="text-muted">/ ${curso.vagasTotal ?? '-'}</small>
        </td>
        <td>${statusPill}</td>
        <td style="text-align: right;">${acoesBotoes}</td>
      </tr>
    `;

    // Cartão Mobile com indicador claro de vagas
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
          <div><strong>Carga:</strong> ${curso.carga || "0"}h | <strong>Valor:</strong> R$ ${Number(curso.valor || 0).toFixed(2)}</div>
          <div><strong>Vagas Disponíveis:</strong> <span class="text-dark fw-bold">${curso.vagasDisponiveis ?? '-'}</span> de ${curso.vagasTotal ?? '-'}</div>
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


/* ==========================================================================
 * GESTÃO DE MODAIS E EVENTOS (DOM CONTENT LOADED)
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const modalCursoEl = document.getElementById("novoCursoModal");
  if (modalCursoEl && window.bootstrap) {
    cursoModalInstance = new bootstrap.Modal(modalCursoEl);
  }

  const btnConfirmarExcluir = document.getElementById("btn-confirmar-exclusao-curso");
  if (btnConfirmarExcluir) {
    btnConfirmarExcluir.addEventListener("click", executarInativacaoCurso);
  }

  const formCurso = document.getElementById("formNovoCurso");
  if (formCurso) {
    formCurso.addEventListener("submit", salvarCurso);
  }

  const inputBusca = document.getElementById("busca-curso");
  if (inputBusca) {
    inputBusca.addEventListener("input", () => {
      renderizarTabelaCursos(listaCursos);
    });
  }

  const btnNovoCurso = document.getElementById("btn-novo-curso");
  if (btnNovoCurso) {
    btnNovoCurso.addEventListener("click", () => {
      if (formCurso) formCurso.reset();
      const inputId = document.getElementById("curso-id-oculto");
      if (inputId) inputId.value = "";
      const modalTitulo = document.getElementById("novoCursoModalLabel");
      if (modalTitulo) modalTitulo.textContent = "Novo Treinamento";
      const auditEl = document.getElementById("curso-atualizado-por");
      if (auditEl) auditEl.value = "Registo novo";

      if (cursoModalInstance) cursoModalInstance.show();
    });
  }
});


/* ==========================================================================
 * FUNÇÕES GLOBAIS DE INTERAÇÃO (EDITAR E INATIVAR)
 * ========================================================================== */

window.abrirModalEditarCurso = async function (id) {
  try {
    const docRef = doc(db, "cursos", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const formCurso = document.getElementById("formNovoCurso");

      let inputId = document.getElementById("curso-id-oculto");
      if (!inputId && formCurso) {
        inputId = document.createElement("input");
        inputId.type = "hidden";
        inputId.id = "curso-id-oculto";
        formCurso.appendChild(inputId);
      }
      if (inputId) inputId.value = id;

      const setVal = (elementId, val) => {
        const el = document.getElementById(elementId);
        if (el) el.value = val !== undefined && val !== null ? val : "";
      };

      setVal("nomeCurso", data.nome);
      setVal("codigoCurso", data.codigo);
      setVal("cargaCurso", data.carga);
      setVal("valorCurso", data.valor);
      setVal("modalidadeCurso", data.modalidade || "Presencial");
      setVal("statusCurso", data.status || "Ativo");
      setVal("vagasTotal", data.vagasTotal);
      setVal("vagasDisponiveis", data.vagasDisponiveis);
      setVal("instrutorCurso", data.instrutor);
      setVal("descricaoCurso", data.descricao);
      setVal("ementaCurso", data.ementa);

      const auditEl = document.getElementById("curso-atualizado-por");
      if (auditEl) {
        if (data.atualizado_por && data.atualizado_em) {
          const dataFmt = new Date(data.atualizado_em).toLocaleString("pt-BR");
          auditEl.value = `${data.atualizado_por} em ${dataFmt}`;
        } else {
          auditEl.value = "Nenhuma alteração registada anteriormente";
        }
      }

      const modalTitulo = document.getElementById("novoCursoModalLabel");
      if (modalTitulo) modalTitulo.textContent = `Editar Curso: ${data.nome || ''}`;

      const modalEl = document.getElementById("novoCursoModal");
      const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modalInstance.show();
    } else {
      alert("Curso não encontrado.");
    }
  } catch (err) {
    console.error("Erro ao carregar dados do curso:", err);
  }
};

window.iniciarExclusaoCurso = function (id) {
  cursoIdParaExcluir = id;
  const modalEl = document.getElementById("modalConfirmarExclusaoCurso");
  if (modalEl) {
    const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modalInstance.show();
  }
};


/* ==========================================================================
 * SUBMISSÃO E INATIVAÇÃO NO FIRESTORE
 * ========================================================================== */

async function salvarCurso(e) {
  e.preventDefault();

  const inputId = document.getElementById("curso-id-oculto");
  const cursoId = inputId ? inputId.value : "";

  const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
  const dataHoraAtual = new Date().toISOString();

  const getVal = (elementId) => {
    const el = document.getElementById(elementId);
    return el ? el.value : "";
  };

  const dadosCurso = {
    nome: getVal("nomeCurso"),
    codigo: getVal("codigoCurso"),
    carga: getVal("cargaCurso"),
    valor: Number(getVal("valorCurso") || 0),
    modalidade: getVal("modalidadeCurso"),
    status: getVal("statusCurso"),
    vagasTotal: Number(getVal("vagasTotal") || 0),
    vagasDisponiveis: Number(getVal("vagasDisponiveis") || 0),
    instrutor: getVal("instrutorCurso"),
    descricao: getVal("descricaoCurso"),
    ementa: getVal("ementaCurso"),
    secaoExibicao: getVal("secaoExibicao") || "grade",
    atualizado_por: adminEmail,
    atualizado_em: dataHoraAtual
  };

  try {
    if (cursoId) {
      await updateDoc(doc(db, "cursos", cursoId), dadosCurso);
    } else {
      dadosCurso.criado_em = dataHoraAtual;
      dadosCurso.excluido = false;
      await addDoc(collection(db, "cursos"), dadosCurso);
    }

    const modalEl = document.getElementById("novoCursoModal");
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }
  } catch (err) {
    console.error("Erro ao guardar curso:", err);
    alert("Erro ao gravar dados do curso: " + err.message);
  }
}

async function executarInativacaoCurso() {
  if (!cursoIdParaExcluir) return;

  try {
    const docRef = doc(db, "cursos", cursoIdParaExcluir);
    const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";

    await updateDoc(docRef, {
      excluido: true,
      atualizado_por: adminEmail,
      atualizado_em: new Date().toISOString()
    });

    const modalEl = document.getElementById("modalConfirmarExclusaoCurso");
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (modalInstance) modalInstance.hide();
    }
  } catch (err) {
    console.error("Erro ao inativar curso:", err);
    alert("Não foi possível inativar o curso.");
  } finally {
    cursoIdParaExcluir = null;
  }
}