/**
 * =========================================================================
 * TRAINING WORK — DASHBOARD (dashboard-ui.js)
 * =========================================================================
 *
 * Este arquivo cuida da tela inicial do painel administrativo.
 *
 * O que ele faz:
 *   1. Espera o evento "auth:ready" do sidebar.js;
 *   2. Mostra o nome do admin logado na saudação;
 *   3. Busca os KPIs gerais (turmas, alunos, leads, receita);
 *   4. Popula a tabela de "últimos leads";
 *   5. Popula o card "Resumo do sistema".
 * =========================================================================
 */

import { escutarTurmas } from "../backend/turmas-service.js";
import { escutarAlunos } from "../backend/alunos-service.js";
import { escutarLeads } from "../backend/lead-service.js";
import { escutarCursosService } from "../backend/cursos-service.js";

/* =========================================================================
 * ESTADO LOCAL
 * ========================================================================= */

let dadosTurmas = [];
let dadosAlunos = [];
let dadosLeads = [];
let dadosCursos = [];

let _dashboardIniciado = false;

/* =========================================================================
 * 1. INICIALIZAÇÃO
 * =========================================================================
 *
 * NÃO usamos escutarSessao aqui. Quem cuida de autenticação é o sidebar.js
 * (via checkAuth). Este arquivo apenas espera o evento "auth:ready" que o
 * sidebar dispara quando o admin está pronto.
 * ========================================================================= */

function aplicarAdmin(adminData) {
    // Evita inicializar duas vezes (o evento pode disparar + o __adminLogado
    // já pode estar preenchido no carregamento)
    if (_dashboardIniciado) return;
    _dashboardIniciado = true;

    // Atualiza a saudação
    const saudacao = document.getElementById("dashboard-saudacao");
    if (saudacao) {
        const primeiroNome = (adminData.nome || "Admin").split(" ")[0];
        saudacao.textContent = `Bem-vindo de volta, ${primeiroNome}! Aqui está o resumo geral do sistema.`;
    }

    // Inicia os listeners de dados
    escutarDadosDashboard();
}

// Caso 1: o sidebar.js dispara o evento DEPOIS deste arquivo carregar.
window.addEventListener("auth:ready", (e) => {
    aplicarAdmin(e.detail.adminData);
});

// Caso 2: o sidebar.js já disparou ANTES deste arquivo carregar.
if (window.__adminLogado) {
    aplicarAdmin(window.__adminLogado.adminData);
}

/* =========================================================================
 * 2. LISTENERS DE DADOS
 * ========================================================================= */

function escutarDadosDashboard() {
    // --- TURMAS ---
    try {
        escutarTurmas((turmas) => {
            dadosTurmas = Array.isArray(turmas) ? turmas : [];
            recalcularTudo();
        });
    } catch (e) {
        console.error("Erro ao escutar turmas:", e);
    }

    // --- ALUNOS ---
    try {
        escutarAlunos((alunos) => {
            dadosAlunos = Array.isArray(alunos) ? alunos : [];
            recalcularTudo();
        });
    } catch (e) {
        console.error("Erro ao escutar alunos:", e);
    }

    // --- LEADS ---
    try {
        escutarLeads((leads) => {
            dadosLeads = Array.isArray(leads) ? leads : [];
            recalcularTudo();
        });
    } catch (e) {
        console.error("Erro ao escutar leads:", e);
    }

    // --- CURSOS (para o Resumo do Sistema) ---
    try {
        if (typeof escutarCursosService === "function") {
            escutarCursosService((cursos) => {
                dadosCursos = Array.isArray(cursos) ? cursos : [];
                recalcularTudo();
            });
        }
    } catch (e) {
        console.warn("Erro ao escutar cursos:", e);
    }
}

/* =========================================================================
 * 3. RECÁLCULO GERAL
 * =========================================================================
 *
 * Sempre que qualquer listener dispara, esta função roda e atualiza:
 *   - Os 4 KPIs do topo;
 *   - A tabela de últimos leads;
 *   - O card "Resumo do Sistema".
 * ========================================================================= */

function recalcularTudo() {
    recalcularKPIs();
    renderizarTabelaLeads();
    renderizarResumoSistema();
}

/* =========================================================================
 * 4. KPIs DO TOPO
 * ========================================================================= */

function recalcularKPIs() {
    // --- Turmas ativas ---
    const turmasAtivas = dadosTurmas.filter((t) => {
        const st = String(t.status || "Ativo").toLowerCase();
        return st === "ativo" || st === "ativa";
    });

    // --- Alunos matriculados (soma de matriculados em cada turma ativa) ---
    let totalAlunosMatriculados = 0;
    turmasAtivas.forEach((t) => {
        const arr = Array.isArray(t.alunos_matriculados) ? t.alunos_matriculados : [];
        totalAlunosMatriculados += arr.length;
    });

    // --- Leads ativos (não convertidos nem perdidos) ---
    const leadsAtivos = dadosLeads.filter((l) => {
        const st = String(l.status || "").toLowerCase();
        return st !== "convertido" && st !== "perdido";
    });

    // --- Receita total (placeholder — implementaremos com financeiro depois) ---
    const receitaTotal = 0;

    // --- Atualiza DOM ---
    atualizarTexto("kpi-turmas-ativas", turmasAtivas.length);
    atualizarTexto("kpi-total-alunos", totalAlunosMatriculados);
    atualizarTexto("kpi-leads-ativos", leadsAtivos.length);
    atualizarTexto("kpi-receita-total", formatarMoeda(receitaTotal));
}

/* =========================================================================
 * 5. RESUMO DO SISTEMA (card lateral direito)
 * ========================================================================= */

function renderizarResumoSistema() {
    const totalTurmas = dadosTurmas.length;
    const totalCursos = dadosCursos.length;
    const totalAlunos = dadosAlunos.length;

    const turmasAtivas = dadosTurmas.filter((t) => {
        const st = String(t.status || "Ativo").toLowerCase();
        return st === "ativo" || st === "ativa";
    }).length;
    const turmasInativas = totalTurmas - turmasAtivas;

    atualizarTexto("info-total-cursos", totalCursos);
    atualizarTexto("info-total-turmas", totalTurmas);
    atualizarTexto("info-total-alunos", totalAlunos);
    atualizarTexto("info-turmas-ativas", turmasAtivas);
    atualizarTexto("info-turmas-inativas", turmasInativas);
}

/* =========================================================================
 * 6. TABELA DE ÚLTIMOS LEADS
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
        .sort((a, b) => {
            const tA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
            const tB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
            return tB - tA;
        })
        .slice(0, 5);

    let html = "";
    ultimos.forEach((l) => {
        // ✅ CORRIGIDO: prioriza `name`, cai pra `nome` (retrocompatível)
        const nome = l.name || l.nome || "Sem nome";

        // ✅ Blindado: aceita os dois padrões de campo
        const curso = l.curso_interesse_name
            || l.curso_interesse_nome
            || l.curso
            || "—";

        const status = l.status || "Novo";

        // Cor do badge por status
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