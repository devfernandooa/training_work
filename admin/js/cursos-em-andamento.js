import {
  iniciarAutenticacaoTurmas,
  configurarLogout,
  buscarCursosEAlunos,
  buscarDadosModalCurso,
  alterarStatusInativacaoCurso,
  atualizarCursoBackend,
  removerMatriculaBackend,
  adicionarMatriculaBackend
} from "./cursos-em-andamento-backend.js";

let cursoAtualId = null;
let exibindoInativos = false;

/* ==========================================================================
 * FUNÇÃO AUXILIAR: MODAL DE CONFIRMAÇÃO PADRONIZADO
 * ========================================================================== */

function mostrarModalConfirmacao(titulo, mensagem, textoBotao = "Confirmar", corBotao = "btn-danger") {
  return new Promise((resolve) => {
    const modalEl = document.getElementById("modalConfirmacao");
    if (!modalEl) {
      resolve(confirm(mensagem)); 
      return;
    }

    document.getElementById("modalConfirmacaoTitulo").textContent = titulo;
    document.getElementById("modalConfirmacaoTexto").textContent = mensagem;
    
    const btnConfirmar = document.getElementById("btnConfirmarAcaoModal");
    btnConfirmar.textContent = textoBotao;
    btnConfirmar.className = `btn ${corBotao} btn-sm px-3 rounded-pill`;

    const modalInstance = new window.bootstrap.Modal(modalEl);
    
    const novoBtnConfirmar = btnConfirmar.cloneNode(true);
    btnConfirmar.parentNode.replaceChild(novoBtnConfirmar, btnConfirmar);

    document.getElementById("btnConfirmarAcaoModal").addEventListener("click", () => {
      modalInstance.hide();
      resolve(true);
    });

    modalEl.addEventListener('hidden.bs.modal', () => {
      resolve(false);
    }, { once: true });

    modalInstance.show();
  });
}

/* ==========================================================================
 * RENDERIZAÇÃO DA INTERFACE
 * ========================================================================== */

async function carregarPainelTurmas() {
  const grid = document.getElementById("turmasEmAndamentoGrid");
  if (!grid) return;

  try {
    const { cursos, contagemAlunos } = await buscarCursosEAlunos();
    grid.innerHTML = "";

    let totalTurmas = cursos.length;
    let turmasAtivasCount = 0;
    let turmasInativasCount = 0;

    const filtrados = cursos.filter(c => {
      const ativo = c.ativo !== false;
      if (ativo) turmasAtivasCount++;
      else turmasInativasCount++;

      return exibindoInativos ? !ativo : ativo;
    });

    const elTotal = document.getElementById("metric-total-turmas");
    const elAtivas = document.getElementById("metric-turmas-ativas");
    const elInativas = document.getElementById("metric-turmas-inativas");
    const elTituloSecao = document.getElementById("titulo-secao-turmas");
    const btnAlternar = document.getElementById("btn-alternar-inativos");

    if (elTotal) elTotal.textContent = totalTurmas;
    if (elAtivas) elAtivas.textContent = turmasAtivasCount;
    if (elInativas) elInativas.textContent = turmasInativasCount;
    if (elTituloSecao) elTituloSecao.textContent = exibindoInativos ? "Turmas Inativadas" : "Turmas Ativas";
    if (btnAlternar) {
      btnAlternar.innerHTML = exibindoInativos 
        ? '<i class="fas fa-eye me-1"></i> Ver Ativas' 
        : '<i class="fas fa-eye-slash me-1"></i> Ver Inativos';
    }

    if (filtrados.length === 0) {
      grid.innerHTML = `<p class='text-muted text-center w-100 py-4'>Nenhuma turma ${exibindoInativos ? 'inativa' : 'ativa'} encontrada.</p>`;
      return;
    }

    filtrados.forEach((curso) => {
      const cursoId = curso.id;
      const totalAlunos = contagemAlunos[cursoId] || 0;
      const ativo = curso.ativo !== false;

      const colDiv = document.createElement("div");
      colDiv.className = "col-12 col-md-6 col-lg-3 mb-4";

      const statusBadge = ativo 
        ? '<span class="badge bg-success bg-opacity-10 text-success px-2 py-1 rounded-pill" style="font-size: 0.70rem;">Ativo</span>'
        : '<span class="badge bg-secondary bg-opacity-10 text-secondary px-2 py-1 rounded-pill" style="font-size: 0.70rem;">Inativo</span>';

      const modalidadeBadge = `<span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill" style="font-size: 0.70rem;">${curso.modalidade || 'PRESENCIAL'}</span>`;

      const botaoAcaoInativar = ativo
        ? `<button class="btn btn-sm btn-outline-secondary rounded-circle p-1 lh-1 btn-inativar-curso" data-id="${cursoId}" title="Inativar Turma" style="width: 32px; height: 32px;"><i class="fas fa-ban"></i></button>`
        : `<button class="btn btn-sm btn-outline-success rounded-circle p-1 lh-1 btn-reativar-curso" data-id="${cursoId}" title="Reativar Turma" style="width: 32px; height: 32px;"><i class="fas fa-check"></i></button>`;

      const nomeInstrutorCard = curso.instrutor || curso.professor || curso.professor_responsavel || curso.docente || 'Instrutor Training Work';

      colDiv.innerHTML = `
        <div class="card h-100 shadow-sm border-0 rounded-4 p-3 bg-white card-hover-effect">
          <div class="card-body d-flex flex-column justify-content-between p-2">
            <div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                ${modalidadeBadge}
                ${statusBadge}
              </div>
              <h6 class="card-title fw-bold text-dark mb-1" style="font-size: 0.95rem;">${curso.sigla ? curso.sigla + ' - ' : ''}${curso.nome}</h6>
              <p class="text-muted small mb-3" style="font-size: 0.8rem;">${curso.descricao || 'Sem descrição informada.'}</p>
              
              <div class="border-top pt-2 mb-3">
                <p class="mb-1 text-secondary small"><i class="fas fa-tag me-1"></i> <strong>Categoria:</strong> ${curso.categoria || 'Geral'}</p>
                <p class="mb-1 text-secondary small"><i class="fas fa-user-tie me-1"></i> <strong>Instrutor:</strong> ${nomeInstrutorCard}</p>
                <p class="mb-1 text-secondary small"><i class="fas fa-clock me-1"></i> <strong>Carga:</strong> ${curso.carga_horaria || curso.carga || 0}h</p>
              </div>
            </div>

            <div class="d-flex justify-content-between align-items-center border-top pt-2 mt-auto">
              <span class="text-success fw-semibold small"><i class="fas fa-users me-1"></i> ${totalAlunos} Aluno(s)</span>
              <div class="d-flex gap-1">
                ${botaoAcaoInativar}
                <button class="btn btn-sm btn-outline-primary rounded-circle p-1 lh-1 btn-editar-curso" data-id="${cursoId}" title="Editar Turma" style="width: 32px; height: 32px;">
                  <i class="fas fa-pen"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
      grid.appendChild(colDiv);
    });

    configurarEventosCards();

  } catch (err) {
    console.error("Erro ao carregar turmas:", err);
    grid.innerHTML = "<p class='text-danger text-center w-100'>Erro ao carregar dados do painel.</p>";
  }
}

async function abrirModalEdicao(cursoId) {
  cursoAtualId = cursoId;
  const listaMatriculadosEl = document.getElementById("listaAlunosMatriculados");
  const selectDisponiveisEl = document.getElementById("selectAlunoDisponivel");

  if (!listaMatriculadosEl || !selectDisponiveisEl) return;

  try {
    const dadosModal = await buscarDadosModalCurso(cursoId);
    
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val !== undefined && val !== null ? val : "";
    };

    const curso = dadosModal.curso || {};

    // Extração robusta do instrutor (lida com string, objetos ou campos variados)
    let nomeInstrutor = "";
    const rawInstrutor = curso.instrutor || curso.professor || curso.professor_responsavel || curso.docente || curso.nomeInstrutor;
    if (typeof rawInstrutor === 'string') {
      nomeInstrutor = rawInstrutor;
    } else if (rawInstrutor && typeof rawInstrutor === 'object') {
      nomeInstrutor = rawInstrutor.nome || rawInstrutor.name || "";
    }

    setVal("editCursoId", cursoId);
    setVal("editNomeCurso", curso.nome);
    setVal("editSiglaCurso", curso.sigla || curso.codigo || "");
    setVal("editInstrutorCurso", nomeInstrutor);
    setVal("editCargaCurso", curso.carga_horaria || curso.carga || 0);
    setVal("editStatusCurso", curso.ativo !== false ? "true" : "false");

    // Gestão de Vagas
    const vagasTotais = Number(curso.vagas || curso.vagasTotais || 20);
    const totalMatriculados = dadosModal.matriculados ? dadosModal.matriculados.length : 0;
    const vagasDisponiveisCalc = Math.max(0, vagasTotais - totalMatriculados);

    setVal("editVagasTotais", vagasTotais);
    setVal("editVagasDisponiveis", curso.vagasDisponiveis !== undefined ? curso.vagasDisponiveis : vagasDisponiveisCalc);
    setVal("editDescricaoCurso", curso.descricao || "");

    // Preenche alunos matriculados
    listaMatriculadosEl.innerHTML = "";
    if (!dadosModal.matriculados || dadosModal.matriculados.length === 0) {
      listaMatriculadosEl.innerHTML = '<li class="list-group-item text-muted small border-0">Nenhum aluno matriculado nesta turma.</li>';
    } else {
      dadosModal.matriculados.forEach(mat => {
        const li = document.createElement("li");
        li.className = "list-group-item d-flex justify-content-between align-items-center py-1 px-2 border-0 bg-light mb-1 rounded";
        li.innerHTML = `
          <span class="small">${mat.nome}</span>
          <button class="btn btn-sm text-danger p-0 border-0 bg-transparent btn-remover-matricula" data-matricula-id="${mat.matriculaId}" title="Remover da turma">
            <i class="fas fa-times-circle"></i>
          </button>
        `;
        listaMatriculadosEl.appendChild(li);
      });
    }

    // Preenche select de alunos disponíveis
    selectDisponiveisEl.innerHTML = '<option value="">Selecione um aluno para matricular...</option>';
    if (dadosModal.disponiveis && Array.isArray(dadosModal.disponiveis)) {
      dadosModal.disponiveis.forEach(aluno => {
        const option = document.createElement("option");
        option.value = aluno.id;
        option.textContent = aluno.nome;
        selectDisponiveisEl.appendChild(option);
      });
    }

    const modalElement = document.getElementById('editarCursoModal');
    if (modalElement && window.bootstrap) {
      let modalInstance = window.bootstrap.Modal.getInstance(modalElement);
      if (!modalInstance) {
        modalInstance = new window.bootstrap.Modal(modalElement);
      }
      modalInstance.show();
    }
  } catch (error) {
    console.error("Erro ao abrir modal de edição:", error);
  }
}

/* ==========================================================================
 * EVENTOS E INTERAÇÕES
 * ========================================================================== */

function configurarEventosCards() {
  document.querySelectorAll(".btn-editar-curso").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      abrirModalEdicao(id);
    });
  });

  document.querySelectorAll(".btn-inativar-curso").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      
      const confirmado = await mostrarModalConfirmacao(
        "Inativar Turma",
        "Deseja realmente inativar esta turma? Ela será ocultada da listagem principal.",
        "Sim, Inativar",
        "btn-danger"
      );

      if (confirmado) {
        try {
          await alterarStatusInativacaoCurso(id, false);
          carregarPainelTurmas();
        } catch (err) {
          console.error("Erro ao inativar curso:", err);
        }
      }
    });
  });

  document.querySelectorAll(".btn-reativar-curso").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      try {
        await alterarStatusInativacaoCurso(id, true);
        carregarPainelTurmas();
      } catch (err) {
        console.error("Erro ao reativar curso:", err);
      }
    });
  });

  document.addEventListener("click", async (e) => {
    const btnRemover = e.target.closest(".btn-remover-matricula");
    if (btnRemover) {
      const matriculaId = btnRemover.getAttribute("data-matricula-id");
      
      const confirmado = await mostrarModalConfirmacao(
        "Remover Aluno",
        "Deseja realmente remover este aluno da turma?",
        "Sim, Remover",
        "btn-danger"
      );

      if (confirmado) {
        try {
          await removerMatriculaBackend(matriculaId);
          await abrirModalEdicao(cursoAtualId);
          carregarPainelTurmas();
        } catch (err) {
          console.error("Erro ao remover matrícula:", err);
        }
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  iniciarAutenticacaoTurmas(carregarPainelTurmas);
  configurarLogout();

  const btnAlternar = document.getElementById("btn-alternar-inativos");
  if (btnAlternar) {
    btnAlternar.addEventListener("click", () => {
      exibindoInativos = !exibindoInativos;
      carregarPainelTurmas();
    });
  }

  const btnVincular = document.getElementById("btnVincularAluno");
  if (btnVincular) {
    btnVincular.addEventListener("click", async () => {
      const alunoId = document.getElementById("selectAlunoDisponivel").value;
      if (!alunoId || !cursoAtualId) {
        alert("Selecione um aluno válido.");
        return;
      }

      try {
        await adicionarMatriculaBackend(cursoAtualId, alunoId);
        await abrirModalEdicao(cursoAtualId);
        carregarPainelTurmas();
      } catch (error) {
        console.error("Erro ao matricular aluno:", error);
      }
    });
  }

  const formEditar = document.getElementById("formEditarCurso");
  if (formEditar) {
    formEditar.addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = document.getElementById("editCursoId").value;
      if (!id) return;

      const getVal = (elId) => document.getElementById(elId)?.value || "";

      const dadosAtualizados = {
        nome: getVal("editNomeCurso"),
        sigla: getVal("editSiglaCurso"),
        instrutor: getVal("editInstrutorCurso"),
        carga_horaria: Number(getVal("editCargaCurso")) || 0,
        investimento: Number(getVal("editInvestimentoCurso")) || 0,
        modalidade: getVal("editModalidadeCurso"),
        vagas: Number(getVal("editVagasTotais")) || 20,
        vagasDisponiveis: Number(getVal("editVagasDisponiveis")) || 20,
        ativo: getVal("editStatusCurso") === "true",
        descricao: getVal("editDescricaoCurso")
      };

      try {
        await atualizarCursoBackend(id, dadosAtualizados);
        
        const modalElement = document.getElementById('editarCursoModal');
        if (modalElement && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
          modalInstance.hide();
        }

        carregarPainelTurmas();
      } catch (error) {
        console.error("Erro ao atualizar curso:", error);
        alert("Erro ao atualizar os dados da turma.");
      }
    });
  }
});