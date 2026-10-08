/**
 * =========================================================================
 * TRAINING WORK — UI DE CURSOS (cursos-ui.js)
 * =========================================================================
 *
 * Camada de apresentação: só mexe no DOM.
 * =========================================================================
 */

import {
    escutarCursos,
    obterCursoPorId,
    criarCurso,
    editarCurso,
    excluirCurso,
    reativarCurso
} from "../backend/cursos-service.js";

/* =========================================================================
 * ESTADO
 * ========================================================================= */

let listaCompleta = [];
let listaFiltrada = [];

let paginaAtual = 1;
let itensPorPagina = 20;

let termoBusca = "";
let filtroSecao = "todos";
let filtroStatus = "todos";
let filtroExclusao = "ativos";       // ativos / excluidos / todos

let modalCursoInstance = null;
let modalConfirmacaoInstance = null;
let modalReativarInstance = null;    // ⚡ NOVO
let cursoIdParaExcluir = null;
let cursoIdParaReativar = null;      // ⚡ NOVO
let toastInstance = null;

let timerBusca = null;

/* =========================================================================
 * HELPERS
 * ========================================================================= */

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getIconeSecao(secao) {
    const s = String(secao || "grade").toLowerCase();
    if (s === "nr") return "⚖️ Normas";
    if (s === "oculto") return "🔒 Oculto";
    return "📚 Grade";
}

function mostrarSucesso(msg) {
    const toastEl = document.getElementById("toastCurso");
    const mensagem = document.getElementById("toastCursoMensagem");
    if (!toastEl) return console.log("✅", msg);

    toastEl.classList.remove("bg-danger");
    toastEl.classList.add("bg-success");
    if (mensagem) mensagem.innerHTML = `<i class="fas fa-check-circle me-2"></i>${msg}`;

    if (!toastInstance && window.bootstrap) {
        toastInstance = new bootstrap.Toast(toastEl, { delay: 3000 });
    }
    if (toastInstance) toastInstance.show();
}

function mostrarErro(msg) {
    const toastEl = document.getElementById("toastCurso");
    const mensagem = document.getElementById("toastCursoMensagem");
    if (!toastEl) return console.error("❌", msg);

    toastEl.classList.remove("bg-success");
    toastEl.classList.add("bg-danger");
    if (mensagem) mensagem.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i>${msg}`;

    const t = new bootstrap.Toast(toastEl, { delay: 4000 });
    t.show();
}

/* =========================================================================
 * BOOTSTRAP
 * ========================================================================= */

function inicializarModulo() {
    console.log("🚀 [cursos-ui] Inicializando...");

    configurarModais();
    configurarFiltros();
    configurarFormulario();
    configurarEventosTabela();
    configurarBotaoNovo();
    configurarBotaoConfirmarExclusao();
    configurarBotaoConfirmarReativar();     // ⚡ NOVO

    try {
        escutarCursos((cursos) => {
            console.log("📊 [cursos-ui] Recebi", cursos.length, "cursos");
            listaCompleta = cursos;
            paginaAtual = 1;
            aplicarFiltrosERenderizar();
        }, { incluirExcluidos: true });
    } catch (erro) {
        console.error("❌ Erro ao escutar cursos:", erro);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializarModulo);
} else {
    inicializarModulo();
}

/* =========================================================================
 * MODAIS
 * ========================================================================= */

function configurarModais() {
    const modalCursoEl = document.getElementById("modalCurso");
    if (modalCursoEl && window.bootstrap) {
        modalCursoInstance = new bootstrap.Modal(modalCursoEl);
    }

    const modalConfEl = document.getElementById("modalConfirmacaoCurso");
    if (modalConfEl && window.bootstrap) {
        modalConfirmacaoInstance = new bootstrap.Modal(modalConfEl);
    }

    // ⚡ NOVO
    const modalReativarEl = document.getElementById("modalConfirmacaoReativar");
    if (modalReativarEl && window.bootstrap) {
        modalReativarInstance = new bootstrap.Modal(modalReativarEl);
    }
}

function configurarBotaoConfirmarExclusao() {
    const btn = document.getElementById("btn-confirmar-exclusao-curso");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        if (!cursoIdParaExcluir) return;

        btn.disabled = true;
        btn.textContent = "A excluir...";

        try {
            await excluirCurso(cursoIdParaExcluir);
            if (modalConfirmacaoInstance) modalConfirmacaoInstance.hide();
            mostrarSucesso("Curso excluído com sucesso!");
        } catch (err) {
            mostrarErro("Erro ao excluir: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Excluir";
            cursoIdParaExcluir = null;
        }
    });
}

// ⚡ NOVO
function configurarBotaoConfirmarReativar() {
    const btn = document.getElementById("btn-confirmar-reativar-curso");
    if (!btn) return;

    btn.addEventListener("click", async () => {
        if (!cursoIdParaReativar) return;

        btn.disabled = true;
        btn.textContent = "A reativar...";

        try {
            await reativarCurso(cursoIdParaReativar);
            if (modalReativarInstance) modalReativarInstance.hide();
            mostrarSucesso("Curso reativado com sucesso!");
        } catch (err) {
            mostrarErro("Erro ao reativar: " + err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = "Reativar";
            cursoIdParaReativar = null;
        }
    });
}

/* =========================================================================
 * FILTROS
 * ========================================================================= */

function configurarFiltros() {
    const inputBusca = document.getElementById("busca-curso");
    if (inputBusca) {
        inputBusca.addEventListener("input", (e) => {
            clearTimeout(timerBusca);
            timerBusca = setTimeout(() => {
                termoBusca = e.target.value.trim().toLowerCase();
                paginaAtual = 1;
                aplicarFiltrosERenderizar();
            }, 300);
        });
    }

    const selSecao = document.getElementById("filtro-secao");
    if (selSecao) {
        selSecao.addEventListener("change", (e) => {
            filtroSecao = e.target.value;
            paginaAtual = 1;
            aplicarFiltrosERenderizar();
        });
    }

    const selStatus = document.getElementById("filtro-status-curso");
    if (selStatus) {
        selStatus.addEventListener("change", (e) => {
            filtroStatus = e.target.value;
            paginaAtual = 1;
            aplicarFiltrosERenderizar();
        });
    }

    const selExclusao = document.getElementById("filtro-exclusao");
    if (selExclusao) {
        selExclusao.addEventListener("change", (e) => {
            filtroExclusao = e.target.value;
            paginaAtual = 1;
            aplicarFiltrosERenderizar();
        });
    }

    const selItens = document.getElementById("itens-por-pagina-curso");
    if (selItens) {
        selItens.addEventListener("change", (e) => {
            itensPorPagina = parseInt(e.target.value, 10) || 20;
            paginaAtual = 1;
            aplicarFiltrosERenderizar();
        });
    }
}

/* =========================================================================
 * APLICAR FILTROS
 * ========================================================================= */

function aplicarFiltrosERenderizar() {
    let filtrados = [...listaCompleta];

    // Filtro de exclusão
    if (filtroExclusao === "ativos") {
        filtrados = filtrados.filter((c) => !c.excluido);
    } else if (filtroExclusao === "excluidos") {
        filtrados = filtrados.filter((c) => c.excluido);
    }

    // Busca
    if (termoBusca) {
        filtrados = filtrados.filter((c) => {
            const nome = (c.nome || "").toLowerCase();
            const codigo = (c.codigo || "").toLowerCase();
            const apelido = (c.apelido || "").toLowerCase();
            return nome.includes(termoBusca)
                || codigo.includes(termoBusca)
                || apelido.includes(termoBusca);
        });
    }

    // Seção
    if (filtroSecao !== "todos") {
        filtrados = filtrados.filter((c) => (c.secaoExibicao || "grade") === filtroSecao);
    }

    // Status ativo/inativo
    if (filtroStatus !== "todos") {
        const querAtivo = filtroStatus === "ativo";
        filtrados = filtrados.filter((c) => Boolean(c.ativo) === querAtivo);
    }

    listaFiltrada = filtrados;

    const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));
    if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;

    const inicio = (paginaAtual - 1) * itensPorPagina;
    const fim = inicio + itensPorPagina;
    const pagina = filtrados.slice(inicio, fim);

    renderizarTabela(pagina);
    renderizarContador(filtrados.length, inicio, fim);
    renderizarPaginacao(totalPaginas);
    atualizarKPIs();
}

/* =========================================================================
 * KPIs
 * ========================================================================= */

function atualizarKPIs() {
    const ativos = listaCompleta.filter((c) => !c.excluido);
    const total = ativos.length;
    const grade = ativos.filter((c) => (c.secaoExibicao || "grade") === "grade").length;
    const normas = ativos.filter((c) => c.secaoExibicao === "nr").length;
    const ocultos = ativos.filter((c) => c.secaoExibicao === "oculto").length;

    const elTotal = document.getElementById("kpi-total-cursos");
    const elGrade = document.getElementById("kpi-grade");
    const elNormas = document.getElementById("kpi-normas");
    const elOcultos = document.getElementById("kpi-ocultos");

    if (elTotal) elTotal.textContent = total;
    if (elGrade) elGrade.textContent = grade;
    if (elNormas) elNormas.textContent = normas;
    if (elOcultos) elOcultos.textContent = ocultos;
}

/* =========================================================================
 * TABELA
 * ========================================================================= */

function renderizarTabela(pagina) {
    const tbody = document.getElementById("cursos-tbody");
    if (!tbody) return;

    if (pagina.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Nenhum curso encontrado.</td></tr>`;
        return;
    }

    let html = "";

    pagina.forEach((curso) => {
        const codCurso = curso.codigo || "—";
        const apelido = curso.apelido || "";
        const nome = curso.nome || "Sem nome";
        const carga = curso.carga_horaria || 0;
        const valor = formatarMoeda(curso.investimento_base);
        const modalidade = curso.modalidade_padrao || "Presencial";
        const secao = getIconeSecao(curso.secaoExibicao);
        const isExcluido = curso.excluido;

        // Badge de status
        let badgeStatus;
        if (isExcluido) {
            badgeStatus = `<span class="badge rounded-pill bg-danger bg-opacity-10 text-danger border border-danger px-3 py-2">Excluído</span>`;
        } else if (curso.ativo) {
            badgeStatus = `<span class="badge rounded-pill bg-success bg-opacity-10 text-success border border-success px-3 py-2">Ativo</span>`;
        } else {
            badgeStatus = `<span class="badge rounded-pill bg-secondary bg-opacity-10 text-secondary border border-secondary px-3 py-2">Inativo</span>`;
        }

        // Ações
        const acoes = isExcluido
            ? `
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-sm btn-outline-success px-2 py-1 btn-reativar-curso" data-id="${curso.id}" title="Reativar Curso">
                        <i class="fas fa-undo"></i> Reativar
                    </button>
                </div>
            `
            : `
                <div class="d-flex justify-content-end gap-1">
                    <button class="btn btn-sm btn-outline-primary px-2 py-1 btn-editar-curso" data-id="${curso.id}" title="Editar">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger px-2 py-1 btn-excluir-curso" data-id="${curso.id}" title="Excluir">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;

        const rowStyle = isExcluido ? 'style="opacity: 0.6;"' : '';

        html += `
            <tr ${rowStyle}>
                <td>
                    <span class="fw-bold text-dark font-monospace">${codCurso}</span><br>
                    <small class="text-muted">${apelido || "—"}</small>
                </td>
                <td><strong>${nome}</strong></td>
                <td>${carga}h</td>
                <td>${valor}</td>
                <td><small>${modalidade}</small></td>
                <td><small>${secao}</small></td>
                <td>${badgeStatus}</td>
                <td class="text-end">${acoes}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/* =========================================================================
 * CONTADOR
 * ========================================================================= */

function renderizarContador(total, inicio, fim) {
    const el = document.getElementById("contador-cursos");
    if (!el) return;

    if (total === 0) {
        el.textContent = "Nenhum curso encontrado";
        return;
    }

    const ativos = listaCompleta.filter((c) => !c.excluido).length;
    const excluidos = listaCompleta.filter((c) => c.excluido).length;

    el.textContent = `Mostrando ${inicio + 1}-${Math.min(fim, total)} de ${total} • ${ativos} ativos • ${excluidos} excluídos`;
}

/* =========================================================================
 * PAGINAÇÃO
 * ========================================================================= */

function renderizarPaginacao(totalPaginas) {
    const ul = document.getElementById("paginacao-cursos");
    if (!ul) return;

    if (totalPaginas <= 1) {
        ul.innerHTML = "";
        return;
    }

    let html = "";

    html += `<li class="page-item ${paginaAtual === 1 ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaAtual - 1}"><i class="fas fa-chevron-left"></i></a>
    </li>`;

    const paginas = calcularPaginasVisiveis(paginaAtual, totalPaginas);
    paginas.forEach((p) => {
        if (p === "...") {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        } else {
            html += `<li class="page-item ${p === paginaAtual ? "active" : ""}">
                <a class="page-link" href="#" data-page="${p}">${p}</a>
            </li>`;
        }
    });

    html += `<li class="page-item ${paginaAtual === totalPaginas ? "disabled" : ""}">
        <a class="page-link" href="#" data-page="${paginaAtual + 1}"><i class="fas fa-chevron-right"></i></a>
    </li>`;

    ul.innerHTML = html;

    ul.querySelectorAll("a.page-link").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const p = parseInt(link.getAttribute("data-page"), 10);
            if (!isNaN(p) && p >= 1 && p <= totalPaginas && p !== paginaAtual) {
                paginaAtual = p;
                aplicarFiltrosERenderizar();
                window.scrollTo({ top: 0, behavior: "smooth" });
            }
        });
    });
}

function calcularPaginasVisiveis(atual, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const paginas = [1];
    if (atual > 4) paginas.push("...");
    const inicio = Math.max(2, atual - 1);
    const fim = Math.min(total - 1, atual + 1);
    for (let i = inicio; i <= fim; i++) paginas.push(i);
    if (atual < total - 3) paginas.push("...");
    paginas.push(total);
    return paginas;
}

/* =========================================================================
 * EVENTOS DA TABELA
 * ========================================================================= */

function configurarEventosTabela() {
    const tbody = document.getElementById("cursos-tbody");
    if (!tbody) return;

    tbody.addEventListener("click", async (e) => {
        // Editar
        const btnEditar = e.target.closest(".btn-editar-curso");
        if (btnEditar) {
            const id = btnEditar.getAttribute("data-id");
            await abrirModalEdicao(id);
            return;
        }

        // Excluir
        const btnExcluir = e.target.closest(".btn-excluir-curso");
        if (btnExcluir) {
            cursoIdParaExcluir = btnExcluir.getAttribute("data-id");
            if (modalConfirmacaoInstance) modalConfirmacaoInstance.show();
            return;
        }

        // Reativar
        const btnReativar = e.target.closest(".btn-reativar-curso");
        if (btnReativar) {
            cursoIdParaReativar = btnReativar.getAttribute("data-id");
            if (modalReativarInstance) modalReativarInstance.show();
            return;
        }
    });
}

/* =========================================================================
 * MODAL DE EDIÇÃO / CRIAÇÃO
 * ========================================================================= */

async function abrirModalEdicao(id) {
    try {
        const curso = await obterCursoPorId(id);
        if (!curso) {
            mostrarErro("Curso não encontrado.");
            return;
        }

        preencherFormulario(curso);

        const titulo = document.getElementById("modalCursoTitulo");
        if (titulo) titulo.innerHTML = `<i class="fas fa-book-medical me-2 text-primary"></i>Editar Curso`;

        if (modalCursoInstance) modalCursoInstance.show();
    } catch (erro) {
        console.error("Erro ao abrir modal:", erro);
        mostrarErro("Erro ao carregar dados do curso.");
    }
}

function preencherFormulario(curso) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    setVal("cursoId", curso.id);
    setVal("cursoNome", curso.nome);
    setVal("cursoApelido", curso.apelido);
    setVal("cursoCodigo", curso.codigo);
    setVal("cursoModalidade", curso.modalidade_padrao);
    setVal("cursoAtivo", curso.ativo ? "true" : "false");
    setVal("cursoCarga", curso.carga_horaria);
    setVal("cursoValor", curso.investimento_base);
    setVal("cursoSecao", curso.secaoExibicao);
    setVal("cursoDescricao", curso.descricao);
    setVal("cursoEmenta", curso.ementa);

    const auditEl = document.getElementById("cursoAuditoria");
    if (auditEl) {
        if (curso.atualizado_por && curso.atualizado_em) {
            const fmt = new Date(curso.atualizado_em).toLocaleString("pt-BR");
            auditEl.value = `Última alteração por ${curso.atualizado_por} em ${fmt}`;
        } else {
            auditEl.value = "Sem registo anterior";
        }
    }
}

function limparFormulario() {
    const form = document.getElementById("formCurso");
    if (form) form.reset();

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal("cursoId", "");
    setVal("cursoAtivo", "true");
    setVal("cursoModalidade", "Presencial");
    setVal("cursoSecao", "grade");
    setVal("cursoAuditoria", "Registro novo");
}

/* =========================================================================
 * FORMULÁRIO
 * ========================================================================= */

function configurarFormulario() {
    const form = document.getElementById("formCurso");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const getVal = (id) => document.getElementById(id)?.value || "";
        const id = getVal("cursoId");

        const dados = {
            nome: getVal("cursoNome").trim(),
            apelido: getVal("cursoApelido").trim(),
            codigo: getVal("cursoCodigo").trim().toUpperCase(),
            modalidade_padrao: getVal("cursoModalidade"),
            ativo: getVal("cursoAtivo") === "true",
            carga_horaria: Number(getVal("cursoCarga")) || 0,
            investimento_base: Number(getVal("cursoValor")) || 0,
            secaoExibicao: getVal("cursoSecao") || "grade",
            descricao: getVal("cursoDescricao").trim(),
            ementa: getVal("cursoEmenta").trim()
        };

        if (!dados.nome) return mostrarErro("Nome do curso é obrigatório.");
        if (!dados.codigo) return mostrarErro("Código do curso é obrigatório.");

        const btn = document.getElementById("btn-salvar-curso");
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> A guardar...'; }

        try {
            if (id) {
                await editarCurso(id, dados);
                mostrarSucesso("Curso atualizado com sucesso!");
            } else {
                await criarCurso(dados);
                mostrarSucesso("Curso criado com sucesso!");
            }

            if (modalCursoInstance) modalCursoInstance.hide();
            limparFormulario();
        } catch (err) {
            mostrarErro("Erro ao guardar: " + err.message);
        } finally {
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save me-1"></i> Guardar Curso'; }
        }
    });
}

/* =========================================================================
 * BOTÃO "NOVO CURSO"
 * ========================================================================= */

function configurarBotaoNovo() {
    const btn = document.getElementById("btn-novo-curso");
    if (!btn) return;

    btn.addEventListener("click", () => {
        limparFormulario();

        const titulo = document.getElementById("modalCursoTitulo");
        if (titulo) titulo.innerHTML = `<i class="fas fa-book-medical me-2 text-primary"></i>Novo Curso`;

        if (modalCursoInstance) modalCursoInstance.show();
    });
}