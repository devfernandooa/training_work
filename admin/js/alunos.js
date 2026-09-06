import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, onSnapshot, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Autenticação e Controle de Sessão
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.replace("/admin/login");
    return;
  }
  const userDisplay = document.getElementById("user-display");
  if (userDisplay) userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;

  carregarDadosAlunos();
});

// Logout
document.getElementById("btn-logout")?.addEventListener("click", () => {
  signOut(auth).then(() => window.location.replace("/admin/login"));
});

// 2. Escuta em Tempo Real de Alunos e Matrículas
let listaAlunos = [];
let matriculasPorAluno = {};

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

    // Ordena do mais recente para o mais antigo (prioriza criado_em ou data_cadastro)
    listaAlunos.sort((a, b) => new Date(b.criado_em || b.data_cadastro || 0) - new Date(a.criado_em || a.data_cadastro || 0));

    renderizarTabelaAlunos(listaAlunos);
  });
}

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
  alunos.forEach(a => {
    if (a.status === "ativo" || !a.status) ativos++;
  });

  const metricTotal = document.getElementById("metric-total-alunos");
  const metricAtivos = document.getElementById("metric-alunos-ativos");
  if (metricTotal) metricTotal.textContent = alunos.length;
  if (metricAtivos) metricAtivos.textContent = ativos;

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum aluno encontrado.</td></tr>`;
    return;
  }

  filtrados.forEach(aluno => {
    const cursos = matriculasPorAluno[aluno.id] || [];
    const cursosTags = cursos.length > 0
      ? cursos.map(c => `<span style="display:inline-block; background:#f1f5f9; color:#334155; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; margin: 2px;">${c}</span>`).join(" ")
      : `<span style="color:#94a3b8; font-size:0.8rem;">Sem matrículas ativas</span>`;

    const cleanPhone = (aluno.telefone || "").replace(/\D/g, "");
    const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
    const zapLink = `https://wa.me/${ddiPhone}`;

    const dataOriginal = aluno.criado_em || aluno.data_cadastro;
    const dataFormatada = dataOriginal ? new Date(dataOriginal).toLocaleDateString("pt-BR") : "Recente";

    const statusText = aluno.status === "inativo" ? "Inativo" : "Ativo";
    const statusColor = aluno.status === "inativo" ? "#dc2626" : "#16a34a";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>
        <strong>${aluno.nome || "Não informado"}</strong><br>
        <small style="color: #64748b;">${aluno.email || ""}</small>
      </td>
      <td>${aluno.telefone || "-"}</td>
      <td style="max-width: 250px;">${cursosTags}</td>
      <td>${dataFormatada}</td>
      <td><span style="color: ${statusColor}; font-weight: 700; font-size: 0.85rem;">● ${statusText}</span></td>
      <td>
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" title="Falar no WhatsApp">
          <i class="fab fa-whatsapp"></i> Contato
        </a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Filtro de busca por input
document.getElementById("busca-aluno")?.addEventListener("input", () => {
  renderizarTabelaAlunos(listaAlunos);
});

// 3. Cadastro de Novo Aluno via Modal
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
      const endereco = document.getElementById("enderecoAluno").value;
      const observacoes = document.getElementById("observacoesAluno").value;

      try {
        await addDoc(collection(db, "alunos"), {
          nome,
          email,
          cpf,
          telefone,
          nascimento,
          status,
          endereco,
          observacoes,
          criado_em: new Date().toISOString()
        });

        // Fecha o modal do Bootstrap de forma segura
        const modalElement = document.getElementById('modalNovoAluno');
        const modalInstance = window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement);
        modalInstance.hide();

        // Limpa o formulário
        formNovoAluno.reset();
      } catch (error) {
        console.error("Erro ao cadastrar novo aluno:", error);
        alert("Erro ao salvar o aluno. Tente novamente.");
      }
    });
  }

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

    // Atualiza os cards compactos
    document.getElementById("metric-total-alunos").textContent = alunos.length;
    document.getElementById("metric-alunos-ativos").textContent = ativos;
    document.getElementById("metric-alunos-inativos").textContent = inativos;
    document.getElementById("metric-alunos-debitos").textContent = debitos;

    if (filtrados.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhum aluno encontrado.</td></tr>`;
      return;
    }

    filtrados.forEach(aluno => {
      const cursos = matriculasPorAluno[aluno.id] || [];
      const cursosTags = cursos.length > 0
        ? cursos.map(c => `<span style="display:inline-block; background:#f1f5f9; color:#334155; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; margin: 2px;">${c}</span>`).join(" ")
        : `<span style="color:#94a3b8; font-size:0.8rem;">Sem matrículas ativas</span>`;

      const cleanPhone = (aluno.telefone || "").replace(/\D/g, "");
      const ddiPhone = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;
      const zapLink = `https://wa.me/${ddiPhone}`;

      const dataOriginal = aluno.criado_em || aluno.data_cadastro;
      const dataFormatada = dataOriginal ? new Date(dataOriginal).toLocaleDateString("pt-BR") : "Recente";

      const statusAluno = (aluno.status || "ativo").toLowerCase();
      let statusText = "Ativo";
      let statusColor = "#16a34a";

      if (statusAluno === "inativo") {
        statusText = "Inativo";
        statusColor = "#dc2626";
      } else if (statusAluno === "debito") {
        statusText = "Em Débito";
        statusColor = "#d97706";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
      <td>
        <strong>${aluno.nome || "Não informado"}</strong><br>
        <small style="color: #64748b;">${aluno.email || ""}</small>
      </td>
      <td>${aluno.telefone || "-"}</td>
      <td style="max-width: 250px;">${cursosTags}</td>
      <td>${dataFormatada}</td>
      <td><span style="color: ${statusColor}; font-weight: 700; font-size: 0.85rem;">● ${statusText}</span></td>
      <td>
        <a href="${zapLink}" target="_blank" class="btn-whatsapp" title="Falar no WhatsApp">
          <i class="fab fa-whatsapp"></i> Contato
        </a>
      </td>
    `;
      tbody.appendChild(tr);
    });
  }

  
});

// Função para buscar o endereço automaticamente via ViaCEP
document.addEventListener("DOMContentLoaded", () => {
    const cepInput = document.getElementById("cepAluno");
    
    if (cepInput) {
        cepInput.addEventListener("blur", function() {
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
                            
                            // Joga o foco para o campo número automaticamente
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

