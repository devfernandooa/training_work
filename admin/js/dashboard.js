import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  setDoc,
  addDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/* ==========================================================================
 * CONTROLO DE SESSÃO E AUTENTICAÇÃO
 * ========================================================================== */

onAuthStateChanged(auth, (user) => {
  const userDisplay = document.getElementById("user-display");
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  if (userDisplay) {
    userDisplay.innerHTML = `<i class="fas fa-user-circle"></i> ${user.email}`;
  }

  escutarInscricoes();
});

const btnLogout = document.getElementById("btn-logout");
if (btnLogout) {
  btnLogout.addEventListener("click", () => {
    signOut(auth).then(() => window.location.replace("login.html"));
  });
}


/* ==========================================================================
 * SINCRONIZAÇÃO EM TEMPO REAL (FIRESTORE)
 * ========================================================================== */

let listaInscricoes = [];

function escutarInscricoes() {
  const colRef = collection(db, "inscricoes");

  onSnapshot(colRef, (snapshot) => {
    listaInscricoes = [];

    snapshot.forEach((docSnap) => {
      const dataLead = docSnap.data();
      // Ignora registos marcados como excluídos/inativos
      if (!dataLead.excluido) {
        listaInscricoes.push({ id: docSnap.id, ...dataLead });
      }
    });

    listaInscricoes.sort((a, b) => {
      const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : (a.data?.seconds ? a.data.seconds * 1000 : 0);
      const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : (b.data?.seconds ? b.data.seconds * 1000 : 0);
      return tempoB - tempoA;
    });

    renderizarTabela(listaInscricoes);
  }, (error) => {
    console.error("Erro na leitura do Firestore:", error);
  });
}


/* ==========================================================================
 * RENDERIZAÇÃO DA TABELA (DESKTOP) E DOS CARTÕES (MOBILE)
 * ========================================================================== */

function renderizarTabela(leads) {
  const tbody = document.getElementById("leads-tbody");
  const mobileContainer = document.getElementById("leads-mobile-container");
  const filterElement = document.getElementById("filter-priority");
  const filtro = filterElement ? filterElement.value : "all";

  if (!tbody) {
    console.warn("Elemento 'leads-tbody' não encontrado no HTML.");
    return;
  }

  tbody.innerHTML = "";
  if (mobileContainer) mobileContainer.innerHTML = "";

  const filtrados = filtro === "all" ? leads : leads.filter(l => (l.prioridade || "Média").toLowerCase() === filtro.toLowerCase());

  let alta = 0;
  let emAtendimento = 0;

  leads.forEach(l => {
    const prio = (l.prioridade || "").toLowerCase();
    const stat = (l.status || "").toLowerCase();
    if (prio === "alta") alta++;
    if (stat === "em_contato" || stat === "em atendimento") emAtendimento++;
  });

  const elTotal = document.getElementById("metric-total");
  const elAlta = document.getElementById("metric-alta");
  const elAtendimento = document.getElementById("metric-atendimento");

  if (elTotal) elTotal.textContent = leads.length;
  if (elAlta) elAlta.textContent = alta;
  if (elAtendimento) elAtendimento.textContent = emAtendimento;

  if (filtrados.length === 0) {
    const msgVazia = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</td></tr>`;
    tbody.innerHTML = msgVazia;
    if (mobileContainer) {
      mobileContainer.innerHTML = `<div style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</div>`;
    }
    return;
  }

  let htmlDesktop = "";
  let htmlMobile = "";

  filtrados.forEach(lead => {
    const status = (lead.status || "novo").toLowerCase();
    const prioridade = lead.prioridade || "Média";

    let badgeClass = "bg-warning text-dark";
    if (prioridade.toLowerCase() === "alta") badgeClass = "bg-danger text-white";
    if (prioridade.toLowerCase() === "baixa") badgeClass = "bg-success text-white";
    const prioridadePill = `<span class="badge rounded-pill ${badgeClass} px-3 py-1" style="font-size: 0.8rem; font-weight: 500;">${prioridade}</span>`;

    let statusStyle = "border: 1px solid #cbd5e1; color: #64748b; background: #f8fafc;";
    if (status === "novo" || status === "pendente") {
      statusStyle = "border: 1px solid #3b82f6; color: #1d4ed8; background: #eff6ff;";
    } else if (status === "em_contato" || status === "em atendimento") {
      statusStyle = "border: 1px solid #f97316; color: #c2410c; background: #fff7ed;";
    } else if (status === "matriculado") {
      statusStyle = "border: 1px solid #22c55e; color: #15803d; background: #f0fdf4;";
    } else if (status === "cancelado" || status === "perdido") {
      statusStyle = "border: 1px solid #94a3b8; color: #475569; background: #f1f5f9;";
    }

    const statusPill = `<span class="status-pill px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1" style="${statusStyle} font-size: 0.82rem; font-weight: 500;">${lead.status || "Novo"}</span>`;

    let dataFormatada = "Recente";
    if (lead.criado_em) {
      dataFormatada = new Date(lead.criado_em).toLocaleDateString("pt-BR");
    } else if (lead.data?.toDate) {
      dataFormatada = lead.data.toDate().toLocaleDateString("pt-BR");
    } else if (lead.data?.seconds) {
      dataFormatada = new Date(lead.data.seconds * 1000).toLocaleDateString("pt-BR");
    }

    const acoesBotoes = `
      <div class="actions-group" style="display: inline-flex; gap: 0.4rem; justify-content: center;">
        <a href="https://wa.me/${lead.telefone || ''}" target="_blank" class="btn-icon btn-icon-whatsapp text-decoration-none" title="Contatar WhatsApp">
          <i class="fab fa-whatsapp"></i>
        </a>
        <button onclick="abrirModalEditar('${lead.id}')" class="btn-icon btn-icon-edit" data-id="${lead.id}" title="Editar Lead">
          <i class="fas fa-pen"></i>
        </button>
        <button onclick="excluirLeadLogico('${lead.id}')" class="btn-icon btn-icon-delete" title="Excluir Lead">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
    `;

    htmlDesktop += `
      <tr>
        <td>${dataFormatada}</td>
        <td>
          <strong>${lead.nome || "Não informado"}</strong><br>
          <small style="color: #64748b;">${lead.email || ""}</small>
        </td>
        <td>${lead.curso || "Geral"}</td>
        <td>${prioridadePill}</td>
        <td style="max-width: 250px; font-size: 0.8rem; color: #475569; line-height: 1.3;">
          ${lead.resumo_ia || lead.mensagem || "-"}
        </td>
        <td>${statusPill}</td>
        <td style="text-align: center;">${acoesBotoes}</td>
      </tr>
    `;

    htmlMobile += `
      <div class="card-lead-item" style="background: white; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <div>
            <strong>${lead.nome || "Não informado"}</strong><br>
            <small style="color: #64748b;">${lead.email || ""}</small>
          </div>
          <div>${prioridadePill}</div>
        </div>
        <div style="font-size: 0.85rem; color: #475569; margin-bottom: 0.75rem;">
          <p style="margin: 0.2rem 0;"><strong>Curso:</strong> ${lead.curso || "Geral"}</p>
          <p style="margin: 0.2rem 0;"><strong>Análise:</strong> ${lead.resumo_ia || lead.mensagem || "-"}</p>
          <p style="margin: 0.2rem 0;"><strong>Status:</strong> ${statusPill}</p>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; margin-top: 0.5rem; padding-top: 0.5rem;">
          <span style="font-size: 0.75rem; color: #94a3b8;">${dataFormatada}</span>
          <div>${acoesBotoes}</div>
        </div>
      </div>
    `;
  });

  tbody.innerHTML = htmlDesktop;
  if (mobileContainer) {
    mobileContainer.innerHTML = htmlMobile;
  }

  configurarInteracoes(leads);
}


/* ==========================================================================
 * GESTÃO DE INTERAÇÕES E MUDANÇAS DE ESTADO (WHATSAPP E MATRÍCULAS)
 * ========================================================================== */

let leadSelecionadoParaMatricula = null;

function configurarInteracoes(leads) {
  document.querySelectorAll("[data-action='contatar']").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  document.querySelectorAll(".btn-perdido-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "perdido" });
    });
  });

  document.querySelectorAll(".btn-reativar-action").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      await updateDoc(doc(db, "inscricoes", id), { status: "em_contato" });
    });
  });

  document.querySelectorAll(".btn-matricular-action").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      leadSelecionadoParaMatricula = leads.find(l => l.id === id);

      if (leadSelecionadoParaMatricula) {
        document.getElementById("modal-titulo").textContent = `Matricular ${leadSelecionadoParaMatricula.nome}`;
        document.getElementById("modal-mensagem").innerHTML = `Confirmar matrícula no curso <strong>${leadSelecionadoParaMatricula.curso}</strong>?`;
        document.getElementById("modal-confirmacao").style.display = "flex";
      }
    });
  });
}


/* ==========================================================================
 * FLUXO DE CONVERSÃO DE LEAD EM ALUNO (MODAL DE MATRÍCULA)
 * ========================================================================== */

const modalConfirmacao = document.getElementById("modal-confirmacao");
const btnModalCancelar = document.getElementById("modal-btn-cancelar");
const btnModalConfirmar = document.getElementById("modal-btn-confirmar");

if (btnModalCancelar) {
  btnModalCancelar.addEventListener("click", () => {
    modalConfirmacao.style.display = "none";
    leadSelecionadoParaMatricula = null;
  });
}

if (btnModalConfirmar) {
  btnModalConfirmar.addEventListener("click", async () => {
    if (!leadSelecionadoParaMatricula) return;

    btnModalConfirmar.disabled = true;
    btnModalConfirmar.textContent = "Gravando...";

    try {
      const lead = leadSelecionadoParaMatricula;
      const cleanPhone = (lead.telefone || "").replace(/\D/g, "");
      const alunoId = lead.cpf ? lead.cpf.replace(/\D/g, "") : `aluno_${Date.now()}`;

      await setDoc(doc(db, "alunos", alunoId), {
        nome: lead.nome || "Não informado",
        email: lead.email || "",
        telefone: cleanPhone,
        status: "ativo",
        lead_origem_id: lead.id,
        criado_em: new Date().toISOString()
      }, { merge: true });

      await addDoc(collection(db, "matriculas"), {
        aluno_id: alunoId,
        aluno_nome: lead.nome || "Não informado",
        aluno_telefone: cleanPhone,
        aluno_email: lead.email || "",
        curso_nome: lead.curso || "Geral",
        status_pagamento: "aprovado",
        status_matricula: "confirmada",
        data_matricula: new Date().toISOString()
      });

      await updateDoc(doc(db, "inscricoes", lead.id), { status: "matriculado" });

      modalConfirmacao.style.display = "none";
    } catch (err) {
      console.error("Erro ao converter matrícula:", err);
      alert("Erro ao matricular: " + err.message);
    } finally {
      btnModalConfirmar.disabled = false;
      btnModalConfirmar.textContent = "Confirmar Matrícula";
      leadSelecionadoParaMatricula = null;
    }
  });
}


// Preenchimento automático de Endereço via ViaCEP
document.addEventListener("DOMContentLoaded", () => {
  const cepInput = document.getElementById("edit-cep");
  if (cepInput) {
    cepInput.addEventListener("blur", async (e) => {
      const cep = e.target.value.replace(/\D/g, "");
      if (cep.length === 8) {
        try {
          const response = `https://viacep.com.br/ws/${cep}/json/`;
          const res = await fetch(response);
          const data = await res.json();

          if (!data.erro) {
            const setVal = (id, val) => {
              const el = document.getElementById(id);
              if (el) el.value = val || "";
            };
            setVal("edit-logradouro", data.logradouro);
            setVal("edit-bairro", data.bairro);
            setVal("edit-cidade", data.localidade);
            setVal("edit-estado", data.uf);

            // Foca automaticamente no campo de número após preencher
            const numEl = document.getElementById("edit-numero");
            if (numEl) numEl.focus();
          } else {
            alert("CEP não encontrado.");
          }
        } catch (error) {
          console.error("Erro ao consultar o ViaCEP:", error);
        }
      }
    });
  }
});


/* ==========================================================================
 * MODAL DE EDIÇÃO DE LEADS (FICHA COMPLETA)
 * ========================================================================== */

let editModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("editLeadModal");
  if (modalEl && window.bootstrap) {
    editModalInstance = new bootstrap.Modal(modalEl);
  }
});

// Função global chamada pelo botão de editar na tabela/cards
window.abrirModalEditar = async function (id) {
  try {
    const docRef = doc(db, "inscricoes", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();

      // Função auxiliar para atribuir valor com segurança se o elemento existir no HTML
      const setFieldValue = (elementId, value) => {
        const el = document.getElementById(elementId);
        if (el) el.value = value;
      };

      const setCheckboxValue = (elementId, checked) => {
        const el = document.getElementById(elementId);
        if (el) el.checked = checked;
      };

      // Preenche os campos básicos
      setFieldValue("edit-lead-id", id);
      setFieldValue("edit-nome", data.nome || data.candidato || "");
      setFieldValue("edit-email", data.email || "");
      setFieldValue("edit-telefone", data.telefone || "");
      setFieldValue("edit-curso", data.curso || "");
      setFieldValue("edit-resumo-ia", data.resumo_ia || data.mensagem || "");
      setFieldValue("edit-redes", data.redes_sociais || "");
      setFieldValue("edit-status", data.status || "Novo");
      setFieldValue("edit-prioridade", data.prioridade || "Média");

      // Preenche Documentos e Profissional
      setFieldValue("edit-cpf", data.cpf || "");
      setFieldValue("edit-rg", data.rg || "");
      setFieldValue("edit-empresa", data.empresa || "");
      setFieldValue("edit-cargo", data.cargo || "");

      // Preenche Endereço
      setFieldValue("edit-cep", data.cep || "");
      setFieldValue("edit-logradouro", data.logradouro || "");
      setFieldValue("edit-numero", data.numero || "");
      setFieldValue("edit-bairro", data.bairro || "");
      setFieldValue("edit-cidade", data.cidade || "");
      setFieldValue("edit-estado", data.estado || "");

      //Redes sociais
      setFieldValue("edit-linkedin", data.linkedin || data.redes_sociais || "");
      setFieldValue("edit-instagram", data.instagram || "");
      setFieldValue("edit-facebook", data.facebook || "");
      setFieldValue("edit-threads", data.threads || "");
      setFieldValue("edit-x", data.x || data.twitter || "");

      // Auditoria (E-mail + Data e Hora formatada)
      if (data.atualizado_por && data.atualizado_em) {
        const dataFormatada = new Date(data.atualizado_em).toLocaleString("pt-BR");
        setFieldValue("edit-atualizado-por", `${data.atualizado_por} em ${dataFormatada}`);
      } else {
        setFieldValue("edit-atualizado-por", "Nenhuma alteração registada anteriormente");
      }

      // Checkboxes de preferências
      setCheckboxValue("edit-zap-msg", !!data.aceita_msg_zap);
      setCheckboxValue("edit-zap-ligacao", !!data.aceita_ligacao_zap);
      setCheckboxValue("edit-email-validado", !!data.email_validado);

      if (editModalInstance) {
        editModalInstance.show();
      }
    } else {
      alert("Inscrição não encontrada.");
    }
  } catch (error) {
    console.error("Erro ao carregar dados do lead:", error);
  }
};

// Submissão do formulário de edição completa
const editForm = document.getElementById("edit-lead-form");
if (editForm) {
  editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("edit-lead-id").value;

    const btnSave = document.getElementById("btn-save-edit");
    if (btnSave) {
      btnSave.disabled = true;
      btnSave.textContent = "A guardar...";
    }

    const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
    const dataHoraAtual = new Date().toISOString();

    const getInputValue = (elementId) => {
      const el = document.getElementById(elementId);
      return el ? el.value : "";
    };

    const getCheckboxValue = (elementId) => {
      const el = document.getElementById(elementId);
      return el ? el.checked : false;
    };

    try {
      const docRef = doc(db, "inscricoes", id);
      await updateDoc(docRef, {
        nome: getInputValue("edit-nome"),
        email: getInputValue("edit-email"),
        telefone: getInputValue("edit-telefone"),
        curso: getInputValue("edit-curso"),

        cpf: getInputValue("edit-cpf"),
        rg: getInputValue("edit-rg"),
        empresa: getInputValue("edit-empresa"),
        cargo: getInputValue("edit-cargo"),

        cep: getInputValue("edit-cep"),
        logradouro: getInputValue("edit-logradouro"),
        numero: getInputValue("edit-numero"),
        bairro: getInputValue("edit-bairro"),
        cidade: getInputValue("edit-cidade"),
        estado: getInputValue("edit-estado"),

        status: getInputValue("edit-status"),
        prioridade: getInputValue("edit-prioridade"),
        linkedin: getInputValue("edit-linkedin"),
        instagram: getInputValue("edit-instagram"),
        facebook: getInputValue("edit-facebook"),
        threads: getInputValue("edit-threads"),
        x: getInputValue("edit-x"),
        resumo_ia: getInputValue("edit-resumo-ia"),

        aceita_msg_zap: getCheckboxValue("edit-zap-msg"),
        aceita_ligacao_zap: getCheckboxValue("edit-zap-ligacao"),
        email_validado: getCheckboxValue("edit-email-validado"),

        atualizado_por: adminEmail,
        atualizado_em: dataHoraAtual
      });

      if (editModalInstance) {
        editModalInstance.hide();
      }
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
      alert("Não foi possível atualizar as alterações.");
    } finally {
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.textContent = "Guardar Alterações";
      }
    }
  });
}


/* ==========================================================================
 * FILTROS E EVENTOS GLOBAIS DA INTERFACE
 * ========================================================================== */

const filterPriority = document.getElementById("filter-priority");
if (filterPriority) {
  filterPriority.addEventListener("change", () => {
    renderizarTabela(listaInscricoes);
  });
}

/* ==========================================================================
 * Função global para inativar o lead (exclusão lógica) sem apagá-lo do Firestore
 * ========================================================================== */
window.excluirLeadLogico = async function (id) {
  if (confirm("Tem a certeza que deseja remover este lead da listagem?")) {
    try {
      const docRef = doc(db, "inscricoes", id);
      const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
      const dataHoraAtual = new Date().toISOString();

      // Atualiza o documento marcando como excluído/inativo
      await updateDoc(docRef, {
        excluido: true,
        atualizado_por: adminEmail,
        atualizado_em: dataHoraAtual
      });

      // O listener em tempo real (onSnapshot) atualizará a tabela automaticamente
    } catch (error) {
      console.error("Erro ao inativar lead:", error);
      alert("Não foi possível remover o lead.");
    }
  }
};

// Variáveis para controlar a exclusão via modal padronizado
let leadIdParaExcluir = null;
let excluirModalInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("modalConfirmarExclusao");
  if (modalEl && window.bootstrap) {
    excluirModalInstance = new bootstrap.Modal(modalEl);
  }

  const btnConfirmar = document.getElementById("btn-confirmar-exclusao");
  if (btnConfirmar) {
    btnConfirmar.addEventListener("click", executarExclusaoLogica);
  }
});

// Chamado pelo botão da lixeira na tabela
window.excluirLeadLogico = function (id) {
  leadIdParaExcluir = id;
  if (excluirModalInstance) {
    excluirModalInstance.show();
  }
};

// Executa a inativação no Firestore após confirmação no modal
async function executarExclusaoLogica() {
  if (!leadIdParaExcluir) return;

  const btnConfirmar = document.getElementById("btn-confirmar-exclusao");
  if (btnConfirmar) {
    btnConfirmar.disabled = true;
    btnConfirmar.textContent = "A remover...";
  }

  try {
    const docRef = doc(db, "inscricoes", leadIdParaExcluir);
    const adminEmail = auth.currentUser ? auth.currentUser.email : "Sistema";
    const dataHoraAtual = new Date().toISOString();

    await updateDoc(docRef, {
      excluido: true,
      atualizado_por: adminEmail,
      atualizado_em: dataHoraAtual
    });

    if (excluirModalInstance) {
      excluirModalInstance.hide();
    }
  } catch (error) {
    console.error("Erro ao inativar lead:", error);
    alert("Não foi possível remover o lead.");
  } finally {
    if (btnConfirmar) {
      btnConfirmar.disabled = false;
      btnConfirmar.textContent = "Sim, Remover";
    }
    leadIdParaExcluir = null;
  }
}