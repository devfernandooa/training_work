import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * CONTROLO DE SESSÃO E AUTENTICAÇÃO
 * ========================================================================== */

onAuthStateChanged(auth, (user) => {
  const userDisplay = document.getElementById("user-display") || document.querySelector(".user-name");
  const userEmailDisplay = document.querySelector(".user-email");
  
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (userDisplay) userDisplay.textContent = user.email.split('@')[0];
  if (userEmailDisplay) userEmailDisplay.textContent = user.email;

  escutarFinanceiro();
});

const btnLogout = document.getElementById("btnLogoutSidebar") || document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}

/* ==========================================================================
 * GRÁFICOS (CHART.JS) E VARIÁVEIS GLOBAIS
 * ========================================================================== */

let graficoFluxoCaixaInstance = null;
let graficoFormasPagamentoInstance = null;
let listaTransacoesGlobal = [];

function formatarMoeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ==========================================================================
 * SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
 * ========================================================================== */

function escutarFinanceiro() {
  const colRef = collection(db, "financeiro");

  onSnapshot(colRef, (snapshot) => {
    listaTransacoesGlobal = [];

    snapshot.forEach((docSnap) => {
      listaTransacoesGlobal.push({ id: docSnap.id, ...docSnap.data() });
    });

    listaTransacoesGlobal.sort((a, b) => {
      const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
      const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
      return tempoB - tempoA;
    });

    atualizarDashboardFinanceiro(listaTransacoesGlobal);
  }, (error) => {
    console.error("Erro ao escutar dados financeiros:", error);
  });
}

/* ==========================================================================
 * PROCESSAMENTO DE DADOS E RENDERIZAÇÃO
 * ========================================================================== */

function atualizarTransacoes(transacoes) {
  const tbody = document.getElementById("financeiro-tbody");
  const filtroStatus = document.getElementById("filtroStatusFinanceiro")?.value || "todos";

  if (!tbody) return;
  tbody.innerHTML = "";

  const filtradas = filtroStatus === "todos" 
    ? transacoes 
    : transacoes.filter(t => (t.status || "").toLowerCase() === filtroStatus.toLowerCase());

  if (filtradas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Nenhum registo financeiro encontrado.</td></tr>`;
    return;
  }

  let html = "";
  filtradas.forEach(t => {
    let dataFormatada = "Recente";
    if (t.criado_em) {
      dataFormatada = new Date(t.criado_em).toLocaleDateString("pt-BR");
    }

    const status = t.status || "Aguardando pagamento";
    let badgeClass = "bg-warning text-dark";
    if (status === "Recebido") badgeClass = "bg-success text-white";
    if (status === "Pendente") badgeClass = "bg-info text-dark";

    html += `
      <tr>
        <td>${dataFormatada}</td>
        <td><strong>${t.alunoNome || "Aluno"}</strong></td>
        <td>${t.curso || "Geral"}</td>
        <td><span class="badge bg-light text-dark border">${t.formaPagamento || "Pix"}</span></td>
        <td class="fw-bold">${formatarMoeda(t.valor)}</td>
        <td><span class="badge ${badgeClass} px-2 py-1">${status}</span></td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function atualizarDashboardFinanceiro(transacoes) {
  let totalRecebido = 0;
  let totalPendente = 0;
  let totalGeral = 0;

  let contagemFormas = { Pix: 0, "Cartão de Crédito": 0, "Boleto Bancário": 0, "À Vista": 0 };
  let contagemStatus = { Recebido: 0, Pendente: 0, "Aguardando pagamento": 0 };

  transacoes.forEach(t => {
    const valor = Number(t.valor || 0);
    totalGeral += valor;

    const status = t.status || "Aguardando pagamento";
    if (status === "Recebido") {
      totalRecebido += valor;
    } else {
      totalPendente += valor;
    }

    if (contagemStatus[status] !== undefined) {
      contagemStatus[status] += valor;
    } else {
      contagemStatus[status] = valor;
    }

    const forma = t.formaPagamento || "Pix";
    if (contagemFormas[forma] !== undefined) {
      contagemFormas[forma] += 1;
    } else {
      contagemFormas[forma] = 1;
    }
  });

  // Atualiza os cartões de topo
  const elRecebido = document.getElementById("financeiro-total-recebido");
  const elPendente = document.getElementById("financeiro-total-pendente");
  const elGeral = document.getElementById("financeiro-total-geral");

  if (elRecebido) elRecebido.textContent = formatarMoeda(totalRecebido);
  if (elPendente) elPendente.textContent = formatarMoeda(totalPendente);
  if (elGeral) elGeral.textContent = formatarMoeda(totalGeral);

  // Renderiza a tabela aplicando o filtro atual
  atualizarTransacoes(transacoes);

  // Renderiza os Gráficos
  renderizarGraficos(contagemStatus, contagemFormas);
}

/* ==========================================================================
 * CONFIGURAÇÃO DOS GRÁFICOS (CHART.JS)
 * ========================================================================== */

function renderizarGraficos(statusData, formasData) {
  // 1. Fluxo de Caixa (Gráfico de Barras)
  const ctxFluxo = document.getElementById("graficoFluxoCaixa")?.getContext("2d");
  if (ctxFluxo) {
    if (graficoFluxoCaixaInstance) graficoFluxoCaixaInstance.destroy();

    graficoFluxoCaixaInstance = new Chart(ctxFluxo, {
      type: 'bar',
      data: {
        labels: ['Recebido', 'Pendente', 'Aguardando Pagamento'],
        datasets: [{
          label: 'Valor (R$)',
          data: [
            statusData["Recebido"] || 0,
            statusData["Pendente"] || 0,
            statusData["Aguardando pagamento"] || 0
          ],
          backgroundColor: ['#198754', '#0dcaf0', '#ffc107'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // 2. Formas de Pagamento (Gráfico de Rosca - Destacando o Pix)
  const ctxFormas = document.getElementById("graficoFormasPagamento")?.getContext("2d");
  if (ctxFormas) {
    if (graficoFormasPagamentoInstance) graficoFormasPagamentoInstance.destroy();

    graficoFormasPagamentoInstance = new Chart(ctxFormas, {
      type: 'doughnut',
      data: {
        labels: ['Pix', 'Cartão de Crédito', 'Boleto Bancário', 'À Vista'],
        datasets: [{
          data: [
            formasData["Pix"] || 0,
            formasData["Cartão de Crédito"] || 0,
            formasData["Boleto Bancário"] || 0,
            formasData["À Vista"] || 0
          ],
          backgroundColor: ['#0d6efd', '#6610f2', '#6c757d', '#20c997']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12 } } }
      }
    });
  }
}

/* ==========================================================================
 * EVENTOS DE FILTRAGEM
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const selectFiltro = document.getElementById("filtroStatusFinanceiro");
  if (selectFiltro) {
    selectFiltro.addEventListener("change", () => {
      atualizarTransacoes(listaTransacoesGlobal);
    });
  }
});