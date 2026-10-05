import { 
    iniciarAutenticacaoFinanceiro, 
    configurarLogout, 
    escutarFinanceiro,
    atualizarStatusFinanceiroBackend,
    editarTransacaoFinanceiraBackend 
} from "../backend/financeiro-service.js";

let graficoFluxoCaixaInstance = null;
let graficoFormasPagamentoInstance = null;
let listaTransacoesGlobal = [];

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// 1. Inicialização
iniciarAutenticacaoFinanceiro(() => {
    configurarLogout();
    escutarFinanceiro((transacoes) => {
        listaTransacoesGlobal = transacoes;
        atualizarDashboardFinanceiro(listaTransacoesGlobal);
    });
});

/* ==========================================================================
 * PROCESSAMENTO DE DADOS E RENDERIZAÇÃO
 * ========================================================================== */

function atualizarTransacoes(transacoes) {
    const tbody = document.getElementById("financeiro-tbody");
    const filtroStatus = document.getElementById("filtroStatusFinanceiro")?.value || "todos";
    const termoBusca = (document.getElementById("busca-transacao")?.value || "").toLowerCase();

    if (!tbody) return;
    tbody.innerHTML = "";

    // Aplica filtros combinados (Status + Termo de Busca por Aluno/Curso)
    const filtradas = transacoes.filter(t => {
        const statusMatch = filtroStatus === "todos" || (t.status || "").toLowerCase() === filtroStatus.toLowerCase();
        const nomeAluno = (t.alunoNome || t.aluno_nome || "").toLowerCase();
        const nomeCurso = (t.curso || "").toLowerCase();
        const buscaMatch = nomeAluno.includes(termoBusca) || nomeCurso.includes(termoBusca);
        return statusMatch && buscaMatch;
    });

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Nenhum registo financeiro encontrado.</td></tr>`;
        return;
    }

    let html = "";
    filtradas.forEach(t => {
        let dataFormatada = "Recente";
        if (t.criado_em) {
            dataFormatada = new Date(t.criado_em).toLocaleDateString("pt-BR");
        }

        const status = t.status || "Aguardando pagamento";

        // Padronização exata das Pills (badges) idênticas ao restante do sistema
        let badgeClass = "badge rounded-pill bg-warning bg-opacity-10 text-warning px-3 py-2 fw-normal border border-warning border-opacity-25";
        let textoStatus = status;

        if (status.includes("Recebido") || status.includes("Pago")) {
            badgeClass = "badge rounded-pill bg-success bg-opacity-10 text-success px-3 py-2 fw-normal border border-success border-opacity-25";
            textoStatus = "Recebido";
        } else if (status === "Pendente") {
            badgeClass = "badge rounded-pill bg-info bg-opacity-10 text-info px-3 py-2 fw-normal border border-info border-opacity-25";
        } else if (status.includes("Aguardando")) {
            badgeClass = "badge rounded-pill bg-warning bg-opacity-10 text-warning px-3 py-2 fw-normal border border-warning border-opacity-25";
        }

        const ultimaData = t.ultima_alteracao_em || "";
        const ultimoPor = t.ultima_alteracao_por || "";
        const ultimaNota = t.auditoria_financeira || "";

        const nomeAluno = t.alunoNome || t.aluno_nome || "";
        const cursoNome = t.curso || "";
        const formaPgto = t.formaPagamento || t.forma_pagamento || "Pix";

        html += `
          <tr>
            <td>${dataFormatada}</td>
            <td><strong>${nomeAluno || "Aluno"}</strong></td>
            <td>${cursoNome || "Geral"}</td>
            <td><span class="badge bg-light text-dark border">${formaPgto}</span></td>
            <td class="fw-bold">${formatarMoeda(t.valor)}</td>
            <td><span class="${badgeClass}">${textoStatus}</span></td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-1">
                <button class="btn btn-sm btn-outline-success px-2 py-1 btn-validar-pagamento" data-id="${t.id}" data-alunoid="${t.alunoId || t.aluno_id || ''}" title="Validar Pagamento">
                  <i class="fas fa-check"></i>
                </button>
                <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar-financeiro" 
                    data-id="${t.id}" 
                    data-alunoid="${t.alunoId || t.aluno_id || ''}" 
                    data-nome="${nomeAluno}" 
                    data-curso="${cursoNome}" 
                    data-valor="${t.valor || 0}" 
                    data-status="${status}" 
                    data-forma="${formaPgto}" 
                    data-ultima-data="${ultimaData}"
                    data-ultimo-por="${ultimoPor}"
                    data-ultima-nota="${ultimaNota}"
                    title="Editar Transação, Descontos e Aluno">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-outline-secondary px-2 py-1 btn-recibo-individual" 
                    data-nome="${nomeAluno}" 
                    data-curso="${cursoNome}" 
                    data-valor="${formatarMoeda(t.valor)}" 
                    data-status="${status}" 
                    data-forma="${formaPgto}" 
                    data-data="${dataFormatada}"
                    title="Gerar Recibo / Relatório Individual">
                  <i class="fas fa-file-alt"></i>
                </button>
              </div>
            </td>
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
        if (status.includes("Recebido") || status.includes("Pago")) {
            totalRecebido += valor;
        } else {
            totalPendente += valor;
        }

        if (contagemStatus[status] !== undefined) {
            contagemStatus[status] += valor;
        } else {
            contagemStatus[status] = valor;
        }

        const forma = t.formaPagamento || t.forma_pagamento || "Pix";
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
                        statusData["Recebido (Pago)"] || statusData["Recebido"] || 0,
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
 * EVENTOS DE INTERAÇÃO, PESQUISA E RELATÓRIOS
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    const selectFiltro = document.getElementById("filtroStatusFinanceiro");
    if (selectFiltro) {
        selectFiltro.addEventListener("change", () => {
            atualizarTransacoes(listaTransacoesGlobal);
        });
    }

    const inputBusca = document.getElementById("busca-transacao");
    if (inputBusca) {
        inputBusca.addEventListener("input", () => {
            atualizarTransacoes(listaTransacoesGlobal);
        });
    }

    // Ações de clique globais na tabela do financeiro
    document.addEventListener("click", async (e) => {
        // Ação: Validar Pagamento Rápido
        const btnValidar = e.target.closest(".btn-validar-pagamento");
        if (btnValidar) {
            const transacaoId = btnValidar.getAttribute("data-id");
            const alunoId = btnValidar.getAttribute("data-alunoid");
            if (!transacaoId) return;

            try {
                await atualizarStatusFinanceiroBackend(transacaoId, alunoId, "Recebido (Pago)", "Pix");
            } catch (error) {
                console.error("Erro ao validar pagamento:", error);
            }
            return;
        }

        // Ação: Abrir Modal Detalhado de Edição
        const btnEditar = e.target.closest(".btn-editar-financeiro");
        if (btnEditar) {
            const transacaoId = btnEditar.getAttribute("data-id");
            const alunoId = btnEditar.getAttribute("data-alunoid");
            const nomeAluno = btnEditar.getAttribute("data-nome") || "";
            const curso = btnEditar.getAttribute("data-curso") || "";
            const valorAtual = btnEditar.getAttribute("data-valor") || 0;
            const statusAtual = btnEditar.getAttribute("data-status") || "Aguardando pagamento";
            const formaAtual = btnEditar.getAttribute("data-forma") || "Pix";

            const ultimaData = btnEditar.getAttribute("data-ultima-data") || "";
            const ultimoPor = btnEditar.getAttribute("data-ultimo-por") || "";
            const ultimaNota = btnEditar.getAttribute("data-ultima-nota") || "";

            document.getElementById("finTransacaoId").value = transacaoId;
            document.getElementById("finAlunoId").value = alunoId;
            document.getElementById("finNomeAluno").value = nomeAluno;
            document.getElementById("finCurso").value = curso;
            document.getElementById("finValorBase").value = valorAtual;
            document.getElementById("finStatusPagamento").value = statusAtual;
            document.getElementById("finFormaPagamento").value = formaAtual;
            document.getElementById("finAjusteTipo").value = "nenhum";
            document.getElementById("finValorAjuste").value = "0";

            const textareaNotas = document.getElementById("finAuditoriaNotas");
            if (textareaNotas) textareaNotas.value = ultimaNota;

            const boxInfo = document.getElementById("infoUltimaAlteracao");
            const textoInfo = document.getElementById("textoUltimaAlteracao");
            if (boxInfo && textoInfo) {
                if (ultimaData && ultimoPor) {
                    const dataFormatada = new Date(ultimaData).toLocaleString("pt-BR");
                    textoInfo.innerHTML = `Última alteração por <strong>${ultimoPor}</strong> em <em>${dataFormatada}</em>`;
                    boxInfo.style.display = "block";
                } else {
                    boxInfo.style.display = "none";
                }
            }

            const modalEl = document.getElementById("modalEditarFinanceiro");
            if (modalEl) {
                const modal = window.bootstrap.Modal.getInstance(modalEl) || new window.bootstrap.Modal(modalEl);
                modal.show();
            }
            return;
        }

        // Ação: Gerar Recibo / Relatório Individual
        const btnRecibo = e.target.closest(".btn-recibo-individual");
        if (btnRecibo) {
            const nome = btnRecibo.getAttribute("data-nome");
            const curso = btnRecibo.getAttribute("data-curso");
            const valor = btnRecibo.getAttribute("data-valor");
            const status = btnRecibo.getAttribute("data-status");
            const forma = btnRecibo.getAttribute("data-forma");
            const data = btnRecibo.getAttribute("data-data");

            const janelaRecibo = window.open('', '_blank');
            janelaRecibo.document.write(`
                <html>
                <head>
                    <title>Recibo de Pagamento - ${nome}</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="p-5">
                    <div class="container border p-4 rounded shadow-sm bg-white" style="max-width: 600px;">
                        <h3 class="text-center text-primary mb-3">TrainingWork - Recibo de Pagamento</h3>
                        <hr>
                        <p><strong>Data:</strong> ${data}</p>
                        <p><strong>Aluno:</strong> ${nome}</p>
                        <p><strong>Curso / Treinamento:</strong> ${curso}</p>
                        <p><strong>Forma de Pagamento:</strong> ${forma}</p>
                        <p><strong>Valor:</strong> ${valor}</p>
                        <p><strong>Status:</strong> <span class="badge bg-success">${status}</span></p>
                        <hr>
                        <div class="text-center mt-4">
                            <button onclick="window.print()" class="btn btn-primary px-4">Imprimir Recibo</button>
                        </div>
                    </div>
                </body>
                </html>
            `);
            janelaRecibo.document.close();
            return;
        }
    });

    // Ação: Gerar Relatório Geral do Financeiro
    const btnRelatorioGeral = document.getElementById("btnRelatorioGeral");
    if (btnRelatorioGeral) {
        btnRelatorioGeral.addEventListener("click", () => {
            const janelaRelatorio = window.open('', '_blank');
            janelaRelatorio.document.write(`
                <html>
                <head>
                    <title>Relatório Financeiro Geral</title>
                    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
                </head>
                <body class="p-4">
                    <div class="container">
                        <h2 class="text-primary mb-3">Relatório Financeiro Geral - TrainingWork</h2>
                        <p class="text-muted">Emitido em: ${new Date().toLocaleDateString("pt-BR")}</p>
                        <table class="table table-bordered table-striped mt-3">
                            <thead class="table-dark">
                                <tr>
                                    <th>Data</th>
                                    <th>Aluno</th>
                                    <th>Curso</th>
                                    <th>Forma</th>
                                    <th>Valor</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${listaTransacoesGlobal.map(t => `
                                    <tr>
                                        <td>${t.criado_em ? new Date(t.criado_em).toLocaleDateString("pt-BR") : 'Recente'}</td>
                                        <td>${t.alunoNome || t.aluno_nome || ''}</td>
                                        <td>${t.curso || ''}</td>
                                        <td>${t.formaPagamento || t.forma_pagamento || ''}</td>
                                        <td>${formatarMoeda(t.valor)}</td>
                                        <td>${t.status || ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        <div class="text-end mt-4">
                            <button onclick="window.print()" class="btn btn-primary px-4">Imprimir Relatório</button>
                        </div>
                    </div>
                </body>
                </html>
            `);
            janelaRelatorio.document.close();
        });
    }

    // Submissão do Formulário do Modal Financeiro com Auditoria
    const formEditarFin = document.getElementById("formEditarFinanceiro");
    if (formEditarFin) {
        formEditarFin.addEventListener("submit", async (e) => {
            e.preventDefault();

            const transacaoId = document.getElementById("finTransacaoId").value;
            const alunoId = document.getElementById("finAlunoId").value;
            const nomeAluno = document.getElementById("finNomeAluno").value;
            const valorBase = parseFloat(document.getElementById("finValorBase").value) || 0;
            const ajusteTipo = document.getElementById("finAjusteTipo").value;
            const valorAjuste = parseFloat(document.getElementById("finValorAjuste").value) || 0;
            const novoStatus = document.getElementById("finStatusPagamento").value;
            const novaForma = document.getElementById("finFormaPagamento").value;
            const notasAuditoria = document.getElementById("finAuditoriaNotas")?.value || "";

            let valorFinal = valorBase;
            if (ajusteTipo === "desconto") {
                valorFinal = valorBase - (valorBase * (valorAjuste / 100));
            } else if (ajusteTipo === "acrescimo") {
                valorFinal = valorBase + (valorBase * (valorAjuste / 100));
            }

            try {
                await editarTransacaoFinanceiraBackend(transacaoId, alunoId, nomeAluno, valorFinal, novoStatus, novaForma, notasAuditoria);

                const modalEl = document.getElementById("modalEditarFinanceiro");
                if (modalEl) {
                    const modal = window.bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                }
            } catch (error) {
                console.error("Erro ao atualizar transação com auditoria:", error);
            }
        });
    }
});