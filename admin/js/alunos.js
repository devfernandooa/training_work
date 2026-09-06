import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Autenticação e Controle de Sessão
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/admin/login");
    return;
  }
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

  carregarDadosAlunos();
  carregarCursosDisponiveis();
});

// Logout
document.getElementById("btn-logout")?.addEventListener("click", () => {
  signOut(auth).then(() => window.location.replace("/admin/login"));
});

// 2. Escuta em Tempo Real de Alunos, Matrículas e Cursos
let listaAlunos = [];
let matriculasPorAluno = {};
let listaCursosDisponiveis = [];

function carregarCursosDisponiveis() {
  onSnapshot(collection(db, "cursos"), (snapshot) => {
    listaCursosDisponiveis = [];
    snapshot.forEach((docSnap) => {
      listaCursosDisponiveis.push({ id: docSnap.id, ...docSnap.data() });
    });
  });
}

function atualizarSelectCursos(cursoSelecionado = "") {
  const select = document.getElementById("editCursoAluno");
  if (!select) return;
  
  select.innerHTML = `<option value="">Nenhum curso matriculado</option>`;
  listaCursosDisponiveis.forEach(curso => {
    const nomeCurso = curso.nome || curso.titulo || "Curso sem nome";
    const selected = nomeCurso === cursoSelecionado ? "selected" : "";
    select.innerHTML += `<option value="${nomeCurso}" ${selected}>${nomeCurso}</option>`;
  });
}

function carregarDadosAlunos() {
  // Listener de Matrículas (agrupa cursos por aluno_id)
  onSnapshot(collection(db, "matriculas"), (snapMatriculas) => {
    matriculasPorAluno = {};
    snapMatriculas.forEach((docSnap) => {
      const mat = docSnap.data();
      const alunoId = mat.aluno_id;
      if (!matriculasPorAluno[alunoId]) {
        matriculasPorAluno[alunoId] = [];
      }
      matriculasPorAluno[alunoId].push(mat.curso_nome || "Geral");
    });
    renderizarTabelaAlunos(listaAlunos);
  });

  // Listener da Coleção Alunos
  onSnapshot(collection(db, "alunos"), (snapAlunos) => {
    listaAlunos = [];
    snapAlunos.forEach((docSnap) => {
      listaAlunos.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Ordena do mais recente para o mais antigo
    listaAlunos.sort((a, b) => new Date(b.criado_em || b.data_cadastro || 0) - new Date(a.criado_em || a.data_cadastro || 0));

    renderizarTabelaAlunos(listaAlunos);
  });
}

// Função Única e Global de Renderização da Tabela de Alunos
function renderizarTabelaAlunos(alunos) {
  const tbody = document.getElementById("alunos-tbody");
  if (!tbody) return;

  const termo = (document.getElementById("busca-aluno")?.value || "").toLowerCase();

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

  // Atualiza os cards de métricas
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

// Filtro de busca por input em tempo real
document.getElementById("busca-aluno")?.addEventListener("input", () => {
  renderizarTabelaAlunos(listaAlunos);
});

// 4. Lógica de Interação da Tabela (Editar, Ativar/Inativar e Excluir)
document.addEventListener("click", async (e) => {
  const target = e.target.closest("button");
  if (!target) return;

  const id = target.getAttribute("data-id");
  if (!id) return;

  // Ação: Ativar / Inativar Status rapidamente
  if (target.classList.contains("btn-status")) {
    const aluno = listaAlunos.find(a => a.id === id);
    if (!aluno) return;

    const novoStatus = (aluno.status || "ativo") === "ativo" ? "inativo" : "ativo";
    try {
      await updateDoc(doc(db, "alunos", id), { status: novoStatus });
    } catch (error) {
      console.error("Erro ao alterar status:", error);
      alert("Erro ao alterar o status do aluno.");
    }
  }

  // Ação: Abrir Modal de Edição
  if (target.classList.contains("btn-editar")) {
    const aluno = listaAlunos.find(a => a.id === id);
    if (!aluno) return;

    document.getElementById("editAlunoId").value = aluno.id;
    document.getElementById("editNomeAluno").value = aluno.nome || "";
    document.getElementById("editEmailAluno").value = aluno.email || "";
    document.getElementById("editCpfAluno").value = aluno.cpf || "";
    document.getElementById("editTelefoneAluno").value = aluno.telefone || "";
    document.getElementById("editNascimentoAluno").value = aluno.nascimento || "";
    document.getElementById("editStatusAluno").value = aluno.status || "ativo";
    document.getElementById("editObservacoesAluno").value = aluno.observacoes || "";

    // Popula o select de cursos e seleciona o atual do aluno
    const cursosAluno = matriculasPorAluno[aluno.id] || [];
    atualizarSelectCursos(cursosAluno[0] || "");

    const modalEdit = new window.bootstrap.Modal(document.getElementById("modalEditarAluno"));
    modalEdit.show();
  }

  // Ação: Abrir Modal de Confirmação de Exclusão
  if (target.classList.contains("btn-excluir")) {
    const aluno = listaAlunos.find(a => a.id === id);
    if (!aluno) return;

    document.getElementById("excluirAlunoId").value = aluno.id;
    document.getElementById("nomeAlunoExcluir").textContent = aluno.nome || "este aluno";

    const modalDel = new window.bootstrap.Modal(document.getElementById("modalExcluirAluno"));
    modalDel.show();
  }
});

// 3. Cadastros, Submissões e Eventos do DOM
document.addEventListener("DOMContentLoaded", () => {
  const formNovoAluno = document.getElementById("formNovoAluno");
  if (formNovoAluno) {
    formNovoAluno.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nome = document.getElementById("nomeAluno").value;
      const email = document.getElementById("emailAluno").value;
      const cpf = document.getElementById("cpfAluno").value;
      const telefone = document.getElementById("telefoneAluno").value;
      const nascimento = document.getElementById("nascimentoAluno").value;
      const status = document.getElementById("statusAluno").value;
      
      const cep = document.getElementById("cepAluno").value;
      const logradouro = document.getElementById("enderecoLogradouro").value;
      const numero = document.getElementById("enderecoNumero").value;
      const bairro = document.getElementById("enderecoBairro").value;
      const cidade = document.getElementById("enderecoCidade").value;
      const estado = document.getElementById("enderecoEstado").value;
      const observacoes = document.getElementById("observacoesAluno").value;

      const enderecoCompleto = { cep, logradouro, numero, bairro, cidade, estado };

      try {
        await addDoc(collection(db, "alunos"), {
          nome,
          email,
          cpf,
          telefone,
          nascimento,
          status,
          endereco: enderecoCompleto,
          observacoes,
          criado_em: new Date().toISOString()
        });

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

  // Submissão do Formulário de Edição (com atualização do Curso/Matrícula)
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

      const cursoEscolhido = document.getElementById("editCursoAluno").value;

      try {
        // Atualiza os dados cadastrais do aluno
        await updateDoc(doc(db, "alunos", alunoId), dadosAtualizados);

        // Atualiza ou cria a matrícula correspondente no Firestore
        const qMatriculas = query(collection(db, "matriculas"), where("aluno_id", "==", alunoId));
        const snapMat = await getDocs(qMatriculas);
        
        const batch = writeBatch(db);
        snapMat.forEach((docMat) => {
          batch.delete(docMat.ref);
        });

        if (cursoEscolhido) {
          const novaMatriculaRef = doc(collection(db, "matriculas"));
          batch.set(novaMatriculaRef, {
            aluno_id: alunoId,
            curso_nome: cursoEscolhido,
            criado_em: new Date().toISOString()
          });
        }

        await batch.commit();

        const modalElement = document.getElementById("modalEditarAluno");
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
      } catch (error) {
        console.error("Erro ao atualizar aluno e matrícula:", error);
        alert("Erro ao salvar as alterações.");
      }
    });
  }

  // Confirmação de Exclusão no Firestore
  const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener("click", async () => {
      const id = document.getElementById("excluirAlunoId").value;
      if (!id) return;

      try {
        await deleteDoc(doc(db, "alunos", id));

        const modalElement = document.getElementById("modalExcluirAluno");
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement);
        modalInstance.hide();
      } catch (error) {
        console.error("Erro ao excluir aluno:", error);
        alert("Erro ao excluir o aluno.");
      }
    });
  }

  // Busca automática de endereço via ViaCEP
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