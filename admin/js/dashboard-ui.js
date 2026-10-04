import {
  obterListaInscricoes,
  atualizarStatusLead,
  processarMatriculaLead,
  carregarDadosEdicaoLead,
  salvarEdicaoLead,
  executarExclusaoLogicaBackend
} from "./dashboard-backend.js";

let editModalInstance = null;
let excluirModalInstance = null;
let leadIdParaExcluir = null;

/* ==========================================================================
 * RENDERIZAÇÃO DA TABELA (DESKTOP) E DOS CARTÕES (MOBILE)
 * ========================================================================== */

export function renderizarTabela(leads) {
  const tbody = document.getElementById("leads-tbody");
  const mobileContainer = document.getElementById("leads-mobile-container");
  const filterElement = document.getElementById("filter-priority");
  const filtro = filterElement ? filterElement.value : "all";

  if (!tbody) return;

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
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #94a3b8; padding: 2rem;">Nenhuma inscrição encontrada.</td></tr>`;
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
        <a href="https://wa.me/${lead.telefone || ''}" target="_blank" class="btn-icon btn-icon-whatsapp text-decoration-none" title="Contatar WhatsApp" data-action="contatar" data-id="${lead.id}">
          <i class="fab fa-whatsapp"></i>
        </a>
        <button class="btn-icon btn-icon-edit btn-editar-action" data-id="${lead.id}" title="Editar Lead">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn-icon btn-icon-delete btn-excluir-action" data-id="${lead.id}" title="Excluir Lead">
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
  if (mobileContainer) mobileContainer.innerHTML = htmlMobile;

  configurarEventosUI(leads);
}


/* ==========================================================================
 * CONFIGURAÇÃO DE EVENTOS VISUAIS E INTERAÇÕES
 * ========================================================================== */

function configurarEventosUI(leads) {
  document.querySelectorAll("[data-action='contatar']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      atualizarStatusLead(id, "em_contato");
    });
  });

  document.querySelectorAll(".btn-editar-action").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const id = e.currentTarget.getAttribute("data-id");
      carregarDadosEdicaoLead(id);
    });
  });

  document.querySelectorAll(".btn-excluir-action").forEach(btn => {
    btn.addEventListener("click", (e) => {
      leadIdParaExcluir = e.currentTarget.getAttribute("data-id");
      if (excluirModalInstance) excluirModalInstance.show();
    });
  });
}


/* ==========================================================================
 * PREENCHIMENTO E GESTÃO DO MODAL DE EDIÇÃO
 * ========================================================================== */

export function preencherModalEdicao(id, data) {
  const setFieldValue = (elementId, value) => {
    const el = document.getElementById(elementId);
    if (el) el.value = value;
  };

  const setCheckboxValue = (elementId, checked) => {
    const el = document.getElementById(elementId);
    if (el) el.checked = checked;
  };

  setFieldValue("edit-lead-id", id);
  setFieldValue("edit-nome", data.nome || data.candidato || "");
  setFieldValue("edit-email", data.email || "");
  setFieldValue("edit-telefone", data.telefone || "");
  setFieldValue("edit-curso", data.curso || "");
  setFieldValue("edit-resumo-ia", data.resumo_ia || data.mensagem || "");
  setFieldValue("edit-redes", data.redes_sociais || "");
  setFieldValue("edit-status", data.status || "Novo");
  setFieldValue("edit-prioridade", data.prioridade || "Média");

  setFieldValue("edit-cpf", data.cpf || "");
  setFieldValue("edit-rg", data.rg || "");
  setFieldValue("edit-empresa", data.empresa || "");
  setFieldValue("edit-cargo", data.cargo || "");

  setFieldValue("edit-cep", data.cep || "");
  setFieldValue("edit-logradouro", data.logradouro || "");
  setFieldValue("edit-numero", data.numero || "");
  setFieldValue("edit-bairro", data.bairro || "");
  setFieldValue("edit-cidade", data.cidade || "");
  setFieldValue("edit-estado", data.estado || "");

  setFieldValue("edit-linkedin", data.linkedin || data.redes_sociais || "");
  setFieldValue("edit-instagram", data.instagram || "");
  setFieldValue("edit-facebook", data.facebook || "");
  setFieldValue("edit-threads", data.threads || "");
  setFieldValue("edit-x", data.x || data.twitter || "");

  if (data.atualizado_por && data.atualizado_em) {
    const dataFormatada = new Date(data.atualizado_em).toLocaleString("pt-BR");
    setFieldValue("edit-atualizado-por", `${data.atualizado_por} em ${dataFormatada}`);
  } else {
    setFieldValue("edit-atualizado-por", "Nenhuma alteração registada anteriormente");
  }

  setCheckboxValue("edit-zap-msg", !!data.aceita_msg_zap);
  setCheckboxValue("edit-zap-ligacao", !!data.aceita_ligacao_zap);
  setCheckboxValue("edit-email-validado", !!data.email_validado);

  // Limpa feedbacks anteriores do modal de matrícula ao abrir
  const feedbackEl = document.getElementById("feedback-matricula");
  if (feedbackEl) feedbackEl.className = "alert d-none";

  if (editModalInstance) editModalInstance.show();
}


/* ==========================================================================
 * INICIALIZAÇÃO DE EVENTOS DOM (MODAIS, VIACEP, FILTROS, MATRÍCULA)
 * ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const modalEl = document.getElementById("editLeadModal");
  if (modalEl && window.bootstrap) {
    editModalInstance = new bootstrap.Modal(modalEl);
  }

  const modalExcluirEl = document.getElementById("modalConfirmarExclusao");
  if (modalExcluirEl && window.bootstrap) {
    excluirModalInstance = new bootstrap.Modal(modalExcluirEl);
  }

  const btnConfirmarExclusao = document.getElementById("btn-confirmar-exclusao");
  if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener("click", async () => {
      if (!leadIdParaExcluir) return;
      btnConfirmarExclusao.disabled = true;
      btnConfirmarExclusao.textContent = "A remover...";
      try {
        await executarExclusaoLogicaBackend(leadIdParaExcluir);
        if (excluirModalInstance) excluirModalInstance.hide();
      } catch (err) {
        console.error("Erro ao remover lead:", err);
      } finally {
        btnConfirmarExclusao.disabled = false;
        btnConfirmarExclusao.textContent = "Sim, Remover";
        leadIdParaExcluir = null;
      }
    });
  }

  const filterPriority = document.getElementById("filter-priority");
  if (filterPriority) {
    filterPriority.addEventListener("change", () => {
      renderizarTabela(obterListaInscricoes());
    });
  }

  // Ação de conversão e pagamento (Matrícula) - Mantém o modal aberto para novas edições
  const btnExecutarMatricula = document.getElementById("btn-executar-matricula");
  const feedbackEl = document.getElementById("feedback-matricula");

  function mostrarFeedback(mensagem, tipo) {
    if (!feedbackEl) return;
    feedbackEl.className = `alert py-2 px-3 small mb-0 alert-${tipo === 'sucesso' ? 'success' : 'danger'} d-block`;
    feedbackEl.textContent = mensagem;
  }

  if (btnExecutarMatricula) {
    btnExecutarMatricula.addEventListener("click", async () => {
      if (feedbackEl) feedbackEl.className = "alert d-none";
      
      const leadId = document.getElementById("edit-lead-id")?.value;
      if (!leadId) {
        mostrarFeedback("Nenhum lead selecionado.", "erro");
        return;
      }

      const formaPagamento = document.getElementById("select-forma-pagamento")?.value || "Pix";
      const statusPagamento = document.getElementById("select-status-pagamento")?.value || "Aguardando pagamento";

      const leadObj = {
        id: leadId,
        nome: document.getElementById("edit-nome")?.value,
        email: document.getElementById("edit-email")?.value,
        telefone: document.getElementById("edit-telefone")?.value,
        curso: document.getElementById("edit-curso")?.value,
        cpf: document.getElementById("edit-cpf")?.value,
        empresa: document.getElementById("edit-empresa")?.value,
        valorCurso: 0 
      };

      btnExecutarMatricula.disabled = true;
      btnExecutarMatricula.textContent = "Processando matrícula...";

      try {
        await processarMatriculaLead(leadObj, formaPagamento, statusPagamento);
        // Informa o sucesso visualmente sem fechar o modal, permitindo continuar a editar
        mostrarFeedback("Pagamento confirmado! Lead convertido em aluno com sucesso. Pode continuar a editar se necessário.", "sucesso");
      } catch (err) {
        let mensagemErro = err.message;
        if (mensagemErro.includes("Missing or insufficient permissions")) {
          mensagemErro = "Erro de permissão no Firebase. Verifique as regras do Firestore.";
        }
        mostrarFeedback("Erro ao converter lead: " + mensagemErro, "erro");
      } finally {
        btnExecutarMatricula.disabled = false;
        btnExecutarMatricula.textContent = "Confirmar Pagamento & Converter Lead em Aluno";
      }
    });
  }

  // Submissão do formulário de edição
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

      const getInputValue = (elementId) => document.getElementById(elementId)?.value || "";
      const getCheckboxValue = (elementId) => document.getElementById(elementId)?.checked || false;

      const dadosFormulario = {
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
        email_validado: getCheckboxValue("edit-email-validado")
      };

      try {
        await salvarEdicaoLead(id, dadosFormulario);
        if (editModalInstance) editModalInstance.hide();
      } catch (error) {
        console.error("Erro ao atualizar:", error);
      } finally {
        if (btnSave) {
          btnSave.disabled = false;
          btnSave.textContent = "Guardar Alterações";
        }
      }
    });
  }

  // Preenchimento automático ViaCEP
  const cepInput = document.getElementById("edit-cep");
  if (cepInput) {
    cepInput.addEventListener("blur", async (e) => {
      const cep = e.target.value.replace(/\D/g, "");
      if (cep.length === 8) {
        try {
          const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
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
            document.getElementById("edit-numero")?.focus();
          }
        } catch (error) {
          console.error("Erro ao consultar o ViaCEP:", error);
        }
      }
    });
  }
});