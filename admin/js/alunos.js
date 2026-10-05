import {
  iniciarAutenticacaoAlunos,
  configurarLogout,
  escutarCursosDisponiveis,
  escutarMatriculas,
  escutarAlunos,
  alterarStatusAlunoBackend,
  excluirAlunoBackend,
  cadastrarAlunoBackend,
  atualizarAlunoComMatriculaBackend
} from "./alunos-backend.js";

let listaAlunos = [];
let matriculasPorAluno = {};
let matriculasDetalhesPorAluno = {};
let listaCursosDisponiveis = [];

// 1. Inicialização de Sessão
iniciarAutenticacaoAlunos(() => {
  configurarLogout();
  inicializarOuvintesDados();
});

// 2. Inicia Escutas de Dados em Tempo Real (Escopo Global)
function inicializarOuvintesDados() {
  escutarCursosDisponiveis((cursos) => {
    listaCursosDisponiveis = cursos;
  });

  // Atualiza mapas de matrículas e detalhes globalmente
  escutarMatriculas((matriculasMap, detalhesMap) => {
    matriculasPorAluno = matriculasMap;
    matriculasDetalhesPorAluno = detalhesMap;
    renderizarTabelaAlunos(listaAlunos);
  });

  escutarAlunos((alunos) => {
    listaAlunos = alunos;
    renderizarTabelaAlunos(listaAlunos);
  });
}

function atualizarSelectCursos(cursoSelecionado = "") {
  const select = document.getElementById("editCursoAluno");
  if (!select) return;

  select.innerHTML = `<option value="">Nenhum curso matriculado</option>`;
  listaCursosDisponiveis.forEach(curso => {
    const nomeCurso = curso.nome || curso.titulo || "Curso sem nome";
    const selected = nomeCurso.trim().toLowerCase() === (cursoSelecionado || "").trim().toLowerCase() ? "selected" : "";
    select.innerHTML += `<option value="${nomeCurso}" ${selected}>${nomeCurso}</option>`;
  });
}

// 3. Renderização da Tabela e Métricas
function renderizarTabelaAlunos(alunos) {
  const tbody = document.getElementById("alunos-tbody");
  if (!tbody) return;

  const termo = (document.getElementById("busca-aluno")?.value || document.getElementById("inputBuscaAluno")?.value || "").toLowerCase();

  tbody.innerHTML = "";
  const filtrados = alunos.filter(a =>
    (a.nome || "").toLowerCase().includes(termo) ||
    (a.email || "").toLowerCase().includes(termo)
  );

  let ativos = 0;
  let inativos = 0;
  let debitos = 0;

  alunos.forEach(a => {
    const status = (a.status || "ativo").toLowerCase();
    if (status === "ativo") ativos++;
    else if (status === "inativo") inativos++;

    if (status === "debito" || a.financeiro === "pendente" || a.em_debito === true) {
      debitos++;
    }
  });

  // Atualiza cards de métricas
  const metricTotal = document.getElementById("metric-total-alunos");
  const metricAtivos = document.getElementById("metric-alunos-ativos");
  const metricInativos = document.getElementById("metric-alunos-inativos");
  const metricDebitos = document.getElementById("metric-alunos-debitos");

  if (metricTotal) metricTotal.textContent = alunos.length;
  if (metricAtivos) metricAtivos.textContent = ativos;
  if (metricInativos) metricInativos.textContent = inativos;
  if (metricDebitos) metricDebitos.textContent = debitos;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  filtrados.forEach(aluno => {
    const cursos = matriculasPorAluno[aluno.id] || [];
    const cursosTags = cursos.length > 0
      ? cursos.map(c => `<span class="badge bg-light text-secondary border m-1">${c}</span>`).join(" ")
      : `<span class="text-muted small">Sem matrículas ativas</span>`;

    const cleanPhone = (aluno.telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const zapLink = cleanPhone ? `https://wa.me/${ddiPhone}` : "#";

    const dataOriginal = aluno.criado_em || aluno.data_cadastro;
    const dataFormatada = dataOriginal ? new Date(dataOriginal).toLocaleDateString("pt-BR") : "Recente";

    const statusAluno = (aluno.status || "ativo").toLowerCase();
    let statusText = "Ativo";
    let statusBadgeClass = "bg-success bg-opacity-10 text-success";
    let iconeStatus = "fa-user-slash";
    let tituloStatus = "Inativar Aluno";
    let classeStatus = "btn-outline-warning";

    if (statusAluno === "inativo") {
      statusText = "Inativo";
      statusBadgeClass = "bg-secondary bg-opacity-10 text-secondary";
      iconeStatus = "fa-user-check";
      tituloStatus = "Ativar Aluno";
      classeStatus = "btn-outline-success";
    } else if (statusAluno === "debito") {
      statusText = "Em Débito";
      statusBadgeClass = "bg-warning bg-opacity-10 text-warning";
    }

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <div class="fw-bold text-dark">${aluno.nome || "Não informado"}</div>
        <small class="text-muted d-block">${aluno.email || ""}</small>
      </td>
      <td class="d-none d-lg-table-cell">${aluno.telefone || "-"}</td>
      <td class="d-none d-lg-table-cell" style="max-width: 250px;">${cursosTags}</td>
      <td class="d-none d-lg-table-cell">${dataFormatada}</td>
      <td>
        <span class="badge ${statusBadgeClass}">
          <i class="fas fa-circle fa-2xs me-1"></i> ${statusText}
        </span>
      </td>
      <td class="text-end">
        <div class="d-flex justify-content-end gap-1">
          <a href="${zapLink}" target="_blank" class="btn btn-sm btn-outline-success d-none d-lg-inline-flex align-items-center gap-1 px-2" title="Contato WhatsApp">
              <i class="fab fa-whatsapp"></i> Contato
          </a>
          <button class="btn btn-sm btn-outline-primary px-2 btn-editar" data-id="${aluno.id}" title="Editar Aluno">
              <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm ${classeStatus} px-2 btn-status" data-id="${aluno.id}" title="${tituloStatus}">
              <i class="fas ${iconeStatus}"></i>
          </button>
          <button class="btn btn-sm btn-outline-danger px-2 btn-excluir" data-id="${aluno.id}" title="Excluir Aluno">
              <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 4. Eventos e Interações da Interface (DOM Carregado)
document.addEventListener("DOMContentLoaded", () => {
  // Filtro de busca
  const inputBusca = document.getElementById("busca-aluno") || document.getElementById("inputBuscaAluno");
  inputBusca?.addEventListener("input", () => {
    renderizarTabelaAlunos(listaAlunos);
  });

  // Ações de clique na tabela (Editar, Status, Excluir) - Listener Único Global
  document.addEventListener("click", async (e) => {
    const target = e.target.closest("button");
    if (!target) return;

    const id = target.getAttribute("data-id");
    if (!id) return;

    // Ação: Alterar Status
    if (target.classList.contains("btn-status")) {
      const aluno = listaAlunos.find(a => a.id === id);
      if (!aluno) return;
      try {
        await alterarStatusAlunoBackend(id, aluno.status || "ativo");
      } catch (error) {
        console.error("Erro ao alterar status:", error);
        alert("Erro ao alterar o status do aluno.");
      }
    }

   // Ação: Abrir Modal de Edição (Versão Blindada com Busca Direta)
    if (target.classList.contains("btn-editar")) {
      const aluno = listaAlunos.find(a => a.id === id);
      if (!aluno) return;

      // 1. Informações Pessoais básicas do Aluno
      document.getElementById("editAlunoId").value = aluno.id;
      document.getElementById("editNomeAluno").value = aluno.nome || "";
      document.getElementById("editEmailAluno").value = aluno.email || "";
      document.getElementById("editCpfAluno").value = aluno.cpf || aluno.id || "";
      document.getElementById("editTelefoneAluno").value = aluno.telefone || "";
      document.getElementById("editNascimentoAluno").value = aluno.nascimento || aluno.data_nascimento || "";
      document.getElementById("editStatusAluno").value = aluno.status || "ativo";
      document.getElementById("editObservacoesAluno").value = aluno.observacoes || "";

      // 2. Busca segura e cruzada na lista de matrículas em memória (ou fallback direto)
      let primeiraMatricula = {};
      if (typeof matriculasDetalhesPorAluno !== "undefined") {
        const listaMat = matriculasDetalhesPorAluno[aluno.id] || matriculasDetalhesPorAluno[aluno.cpf] || [];
        if (listaMat.length > 0) primeiraMatricula = listaMat[0];
      }

      // Extração robusta dos valores financeiros
      const valorCurso = primeiraMatricula.valor || aluno.valor || aluno.valor_curso || "0.00";
      const statusPgto = primeiraMatricula.status_pagamento || aluno.status_pagamento || "Recebido";
      const modalidadePgto = primeiraMatricula.forma_pagamento || primeiraMatricula.modalidade_pagamento || "Pix";

      // Preenchimento seguro dos campos com verificação de IDs
      const elValor = document.getElementById("editValorCurso") || document.getElementById("input-valor-curso");
      if (elValor) elValor.value = valorCurso;

      const elStatusPgto = document.getElementById("editStatusPagamento") || document.getElementById("select-status-pagamento");
      if (elStatusPgto) elStatusPgto.value = statusPgto;

      const elModalidade = document.getElementById("editModalidadePagamento") || document.getElementById("select-forma-pagamento");
      if (elModalidade) elModalidade.value = modalidadePgto;

      // 3. Curso matriculado
      const cursoDoAluno = primeiraMatricula.curso_nome || primeiraMatricula.curso || aluno.curso || "";
      atualizarSelectCursos(cursoDoAluno);

      // 4. Exibe o modal do Bootstrap
      const modalElement = document.getElementById("modalEditarAluno");
      if (modalElement) {
        const modalEdit = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modalEdit.show();
      }
    }

    // Ação: Excluir Aluno
    if (target.classList.contains("btn-excluir")) {
      const aluno = listaAlunos.find(a => a.id === id);
      if (!aluno) return;

      document.getElementById("excluirAlunoId").value = aluno.id;
      const elNome = document.getElementById("nomeAlunoExcluir");
      if (elNome) elNome.textContent = aluno.nome || "este aluno";

      const modalDel = new window.bootstrap.Modal(document.getElementById("modalExcluirAluno"));
      modalDel.show();
    }
  });

  // Submissão do Formulário de Novo Aluno
  const formNovoAluno = document.getElementById("formNovoAluno");
  if (formNovoAluno) {
    formNovoAluno.addEventListener("submit", async (e) => {
      e.preventDefault();

      const dados = {
        nome: document.getElementById("nomeAluno").value,
        email: document.getElementById("emailAluno").value,
        cpf: document.getElementById("cpfAluno").value,
        telefone: document.getElementById("telefoneAluno").value,
        nascimento: document.getElementById("nascimentoAluno").value,
        status: document.getElementById("statusAluno").value,
        observacoes: document.getElementById("observacoesAluno").value
      };

      const endereco = {
        cep: document.getElementById("cepAluno").value,
        logradouro: document.getElementById("enderecoLogradouro").value,
        numero: document.getElementById("enderecoNumero").value,
        bairro: document.getElementById("enderecoBairro").value,
        cidade: document.getElementById("enderecoCidade").value,
        estado: document.getElementById("enderecoEstado").value
      };

      try {
        await cadastrarAlunoBackend(dados, endereco);
        const modalElement = document.getElementById('modalNovoAluno');
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modalInstance.hide();
        formNovoAluno.reset();
      } catch (error) {
        console.error("Erro ao cadastrar novo aluno:", error);
        alert("Erro ao salvar o aluno. Tente novamente.");
      }
    });
  }

  // Submissão do Formulário de Edição
  const formEditarAluno = document.getElementById("formEditarAluno");
  if (formEditarAluno) {
    formEditarAluno.addEventListener("submit", async (e) => {
      e.preventDefault();
      const alunoId = document.getElementById("editAlunoId").value;

      const dadosAtualizados = {
        nome: document.getElementById("editNomeAluno").value,
        email: document.getElementById("editEmailAluno").value,
        cpf: document.getElementById("editCpfAluno").value,
        telefone: document.getElementById("editTelefoneAluno").value,
        nascimento: document.getElementById("editNascimentoAluno").value,
        status: document.getElementById("editStatusAluno").value,
        observacoes: document.getElementById("editObservacoesAluno").value
      };

      const dadosFinanceiros = {
        valor: document.getElementById("editValorCurso").value,
        status_pagamento: document.getElementById("editStatusPagamento").value,
        modalidade_pagamento: document.getElementById("editModalidadePagamento").value
      };

      const cursoEscolhido = document.getElementById("editCursoAluno").value;

      try {
       await atualizarAlunoComMatriculaBackend(alunoId, dadosAtualizados, dadosFinanceiros, cursoEscolhido);
        const modalElement = document.getElementById("modalEditarAluno");
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
      } catch (error) {
        console.error("Erro ao atualizar aluno e matrícula:", error);
        alert("Erro ao salvar as alterações.");
      }
    });
  }

  // Confirmação de Exclusão
  const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener("click", async () => {
      const id = document.getElementById("excluirAlunoId").value;
      if (!id) return;

      try {
        await excluirAlunoBackend(id);
        const modalElement = document.getElementById("modalExcluirAluno");
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
        alert("Erro ao excluir o aluno.");
      }
    });
  }

  // Busca ViaCEP
  const cepInput = document.getElementById("cepAluno");
  if (cepInput) {
    cepInput.addEventListener("blur", function () {
      let cep = this.value.replace(/\D/g, "");
      const loadingIndicator = document.getElementById("cep-loading");

      if (cep.length === 8) {
        if (loadingIndicator) loadingIndicator.style.display = "flex";

        fetch(`https://viacep.com.br/ws/${cep}/json/`)
          .then(response => response.json())
          .then(data => {
            if (loadingIndicator) loadingIndicator.style.display = "none";

            if (!data.erro) {
              document.getElementById("enderecoLogradouro").value = data.logradouro || "";
              document.getElementById("enderecoBairro").value = data.bairro || "";
              document.getElementById("enderecoCidade").value = data.localidade || "";
              document.getElementById("enderecoEstado").value = data.uf || "";
              document.getElementById("enderecoNumero").focus();
            } else {
              alert("CEP não encontrado. Verifique o número digitado.");
              document.getElementById("cepAluno").focus();
            }
          })
          .catch(error => {
            if (loadingIndicator) loadingIndicator.style.display = "none";
            console.error("Erro ao buscar o CEP:", error);
          });
      }
    });
  }
});