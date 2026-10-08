/**
 * =========================================================================
 * TRAINING WORK — DASHBOARD (dashboard-ui.js)
 * =========================================================================
 *
 * Este arquivo cuida da tela inicial do painel administrativo.
 *
 * O que ele faz:
 *   1. Mostra o nome do admin logado na saudação;
 *   2. Busca os KPIs gerais (turmas, alunos, leads, receita);
 *   3. Popula a tabela de "últimos leads";
 *   4. Popula o card "Resumo do sistema".
 *
 * Ele NÃO mexe em autenticação — isso é com o auth-guard.js.
 * Aqui só consumimos os dados e mostramos na tela.
 * =========================================================================
 */

import { escutarTurmas } from "../backend/turmas-service.js";
import { escutarAlunos } from "../backend/alunos-service.js";
import { escutarLeads } from "../backend/lead-service.js";

/* =========================================================================
 * 1. VERIFICAÇÃO DE LOGIN + SAUDAÇÃO
 * =========================================================================
 *
 * NÃO usamos escutarSessao aqui! Quem cuida de autenticação é o sidebar.js
 * (via checkAuth). Este arquivo apenas espera o evento "auth:ready" que o
 * sidebar dispara quando o admin está pronto.
 *
 * Isso evita ter 2 listeners de autenticação rodando ao mesmo tempo, o que
 * causava conflito e redirecionamento de volta para o login.
 * ========================================================================= */

// Função que aplica os dados do admin na interface.
let _dashboardIniciado = false;

function aplicarAdmin(adminData) {
    if (_dashboardIniciado) return;      // ← evita inicializar 2x
    _dashboardIniciado = true;

    const saudacao = document.getElementById("dashboard-saudacao");
    if (saudacao) {
        const primeiroNome = (adminData.nome || "Admin").split(" ")[0];
        saudacao.textContent = `Bem-vindo de volta, ${primeiroNome}! Aqui está o resumo geral do sistema.`;
    }

    escutarDadosDashboard();
}

// Caso 1: o sidebar.js disparou o evento DEPOIS deste arquivo carregar.
window.addEventListener("auth:ready", (e) => {
    aplicarAdmin(e.detail.adminData);
});

// Caso 2: o sidebar.js já tinha disparado ANTES deste arquivo carregar.
// (A ordem de carregamento dos módulos é imprevisível.)
if (window.__adminLogado) {
    aplicarAdmin(window.__adminLogado.adminData);
}
/* =========================================================================
 * 2. LISTENERS DE DADOS
 * ========================================================================= */

// Guardamos os dados em variáveis globais para recálculo quando qualquer
// um dos listeners disparar.
let dadosTurmas = [];
let dadosAlunos = [];
let dadosLeads = [];

function escutarDadosDashboard() {
    // --- TURMAS ---
    try {
        escutarTurmas((turmas) => {
            dadosTurmas = Array.isArray(turmas) ? turmas : [];
            recalcularKPIs();
            renderizarResumoSistema();
        });
    } catch (e) {
        console.error("Erro ao escutar turmas:", e);
    }

    // --- ALUNOS ---
    try {
        escutarAlunos((alunos) => {
            dadosAlunos = Array.isArray(alunos) ? alunos : [];
            recalcularKPIs();
            renderizarResumoSistema();
        });
    } catch (e) {
        console.error("Erro ao escutar alunos:", e);
    }

    // --- LEADS ---
    try {
        escutarLeads((leads) => {
            dadosLeads = Array.isArray(leads) ? leads : [];
            recalcularKPIs();
            renderizarTabelaLeads();
        });
    } catch (e) {
        console.error("Erro ao escutar leads:", e);
    }

    
}

/* =========================================================================
 * 3. CÁLCULO DOS KPIs
 * ========================================================================= */

function recalcularKPIs() {
    // --- Turmas ativas ---
    const turmasAtivas = dadosTurmas.filter(t => {
        const st = String(t.status || "Ativo").toLowerCase();
        return st === "ativo" || st === "ativa";
    });

    // --- Alunos matriculados (soma de matriculados em cada turma) ---
    let totalAlunos = 0;
    turmasAtivas.forEach(t => {
        const arr = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados : [];
        totalAlunos += arr.length;
    });

    // --- Leads ativos (não convertidos nem perdidos) ---
    const leadsAtivos = dadosLeads.filter(l => {
        const st = String(l.status || "").toLowerCase();
        return st !== "convertido" && st !== "perdido";
    });

    // --- Receita total ---
    // A ideia: somar tudo que está marcado como "Recebido" ou "Confirmado"
    // no financeiro. Como não carregamos financeiro aqui, deixamos 0 por ora.
    // Você pode adicionar escutarFinanceiro() depois.
    const receitaTotal = 0;

    // --- Atualiza o DOM ---
    atualizarTexto("kpi-turmas-ativas", turmasAtivas.length);
    atualizarTexto("kpi-total-alunos", totalAlunos);
    atualizarTexto("kpi-leads-ativos", leadsAtivos.length);
    atualizarTexto("kpi-receita-total", formatarMoeda(receitaTotal));
}

/* =========================================================================
 * 4. RESUMO DO SISTEMA (card lateral)
 * ========================================================================= */

function renderizarResumoSistema() {
    const totalTurmas = dadosTurmas.length;
    const turmasAtivas = dadosTurmas.filter(t => {
        const st = String(t.status || "Ativo").toLowerCase();
        return st === "ativo" || st === "ativa";
    }).length;
    const turmasInativas = totalTurmas - turmasAtivas;

    atualizarTexto("info-total-turmas", totalTurmas);
    atualizarTexto("info-total-alunos", dadosAlunos.length);
    atualizarTexto("info-turmas-ativas", turmasAtivas);
    atualizarTexto("info-turmas-inativas", turmasInativas);

    // Aqui não temos o total de cursos — deixamos um placeholder.
    // Se você adicionar escutarCursos(), a gente completa.
    const elCursos = document.getElementById("info-total-cursos");
    if (elCursos && elCursos.textContent === "-") {
        elCursos.textContent = "—";
    }
}

/* =========================================================================
 * 5. TABELA DE ÚLTIMOS LEADS
 * ========================================================================= */

function renderizarTabelaLeads() {
    const tbody = document.getElementById("dashboard-tbody-leads");
    if (!tbody) return;

    if (!dadosLeads || dadosLeads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center text-muted py-4">
                    Nenhum lead recebido ainda.
                </td>
            </tr>
        `;
        return;
    }

    // Ordena por data de criação (mais recentes primeiro) e pega os 5 primeiros.
    const ultimos = [...dadosLeads]
        .sort((a, b) => new Date(b.criado_em || 0) - new Date(a.criado_em || 0))
        .slice(0, 5);

    let html = "";
    ultimos.forEach((l) => {
        const nome = l.nome || "Sem nome";
        const curso = l.curso_interesse_nome || l.curso || "—";
        const status = l.status || "Novo";

        // Cor do badge por status.
        let badgeClasse = "bg-secondary";
        const st = String(status).toLowerCase();
        if (st.includes("novo")) badgeClasse = "bg-primary";
        else if (st.includes("contato")) badgeClasse = "bg-warning text-dark";
        else if (st.includes("qualific")) badgeClasse = "bg-info text-dark";
        else if (st.includes("convert")) badgeClasse = "bg-success";

        html += `
            <tr>
                <td><strong class="text-dark">${nome}</strong></td>
                <td class="text-muted small">${curso}</td>
                <td><span class="badge ${badgeClasse} px-2 py-1">${status}</span></td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* =========================================================================
 * HELPERS
 * ========================================================================= */

function atualizarTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}