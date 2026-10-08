// ==========================================================================
// TRAINING WORK - FIREBASE CURSOS & NORMAS LOADER
// ==========================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCmNDeSYpQNzlecPYr14lyw0dOqL3HVSdo",
  authDomain: "training-work.firebaseapp.com",
  projectId: "training-work",
  storageBucket: "training-work.firebasestorage.app",
  messagingSenderId: "727749084762",
  appId: "1:727749084762:web:e000dd84decbb7d577fa63",
  measurementId: "G-1H1VC22G15"
};

try {
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  async function carregarCatalogoDinamico() {
    const grid = document.getElementById("coursesGrid");
    const normasGrid = document.getElementById("normasGrid") || document.getElementById("nrsGrid");
    const selectCurso = document.getElementById('curso');

    if (!grid && !normasGrid) return;

    try {
      const querySnapshot = await getDocs(collection(db, "cursos"));
      if (querySnapshot.empty) return;

      let coursesHTML = "";
      let normasHTML = "";
      let optionsHTML = '<option value="">Selecione um curso...</option>';

      querySnapshot.forEach((docSnap) => {
        const curso = docSnap.data();

        // 1. Ignora cursos inativados logicamente
        if (curso.excluido) return;

        // 2. Ignora cursos configurados para "Não exibir no site (Apenas Gestão Interna)"
        const secao = String(curso.secaoExibicao || "grade").toLowerCase().trim();
        if (secao === "oculto" || secao === "rascunho" || secao === "nao_exibir") {
          return;
        }

        // 3. Opcional: Ignora se o status do curso for diferente de Ativo/Em Andamento/Turma Aberta
        const statusLower = String(curso.status || "ativo").toLowerCase().trim();
        if (statusLower === "inativo") {
          return;
        }

        const nome = curso.nome || "Treinamento";
        const descricao = curso.descricao || "";
        const carga = curso.carga || "0";
        const modalidade = curso.modalidade || "Presencial";
        const valor = Number(curso.valor || 0).toFixed(2).replace('.', ',');
        const categoria = curso.categoria || "Geral";

        // Popula o select do formulário de contato globalmente
        optionsHTML += `<option value="${nome}">${nome}</option>`;

        if (secao === "normas" || secao === "nr") {
          // Renderiza na seção de Normas Regulamentadoras
          normasHTML += `
            <div class="col-10 col-md-6 col-lg-4 px-4 mb-5 nr-card">
              <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden card-hover-effect" style="width: 26rem;">
                <div class="card-body p-4 d-flex flex-column">
                  
                  <!-- Pill da NR -->
                  <div class="mb-4">
                    <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-semibold border border-primary border-opacity-25" style="font-size: 0.9rem; letter-spacing: 0.5px;">
                      ${curso.codigo_nr || curso.codigo || 'NR00-00'}
                    </span>
                  </div>
                  
                  <!-- Título e Descrição -->
                  <h5 class="card-title fw-bold text-dark mb-3" style="font-size: 1.15rem;">${nome}</h5>
                  <p class="card-text text-secondary mb-4" style="font-size: 0.95rem; line-height: 1.6;">${descricao}</p>
                  
                  <!-- Rodapé com Preço e Botão -->
                  <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                    <div class="text-start">
                      <small class="d-block text-muted fw-bold" style="font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px;">Investimento</small>
                      <span class="fw-bold text-secondary" style="font-size: 1.15rem;">R$ ${valor}</span>
                    </div>
                    <button class="btn btn-outline-primary px-4 py-2 fw-semibold rounded-3" onclick="scrollToContact()">Saiba mais</button>
                  </div>
                  
                </div>
              </div>
            </div>
          `;
        } else {
          // Renderiza na Grade de Treinamentos Principal
          coursesHTML += `
            <div class="course-card visible" data-cat="${categoria.toLowerCase()}">
              <div class="course-card-header">
                <div class="course-icon">⚡</div>
                <div class="course-nr">${categoria}</div>
                <div class="course-title">${nome}</div>
              </div>
              <div class="course-card-body">
                <p class="course-desc">${descricao}</p>
                <div class="course-meta">
                  <span class="meta-item">⏱ ${carga}h</span>
                  <span class="meta-item">📍 ${modalidade}</span>
                  <span class="meta-item">🎓 Certificado</span>
                </div>
              </div>
              <div class="course-card-footer">
                <span class="course-price">R$ ${valor}</span>
                <button class="btn-card" onclick="scrollToContact()">Inscrever-se</button>
              </div>
            </div>
          `;
        }
      });

      if (grid) grid.innerHTML = coursesHTML || "<p class='text-muted text-center w-100'>Nenhum curso na grade.</p>";
      if (normasGrid) normasGrid.innerHTML = normasHTML || "<p class='text-muted text-center w-100'>Nenhuma norma cadastrada.</p>";
      if (selectCurso) selectCurso.innerHTML = optionsHTML;

      if (typeof initFilters === 'function') {
        initFilters();
      }

    } catch (err) {
      console.error("Erro ao carregar catálogo dinâmico do Firestore:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    carregarCatalogoDinamico();
  });

} catch (error) {
  console.error("Erro ao inicializar o Firebase no loader:", error);
}