// ==========================================================================
// TRAINING WORK - FIREBASE CURSOS & NORMAS LOADER
// ==========================================================================
//
// Lê a coleção /cursos do Firestore e renderiza:
//   1. Cards na seção "Grade de Treinamentos" (secaoExibicao: "grade")
//   2. Cards na seção "Normas Regulamentadoras" (secaoExibicao: "nr")
//   3. Opções no select "Curso de interesse" do formulário
//
// Ignora:
//   - Cursos com `excluido: true`
//   - Cursos com `secaoExibicao: "oculto"` (internos)
//   - Cursos com `ativo: false`
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

/* =========================================================================
 * HELPERS
 * ========================================================================= */

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

/**
 * Extrai os campos do curso tolerando nomes antigos e novos.
 */
function normalizarCurso(dados) {
    return {
        id: dados.id || "",
        codigo: dados.codigo || dados.codigo_curso || "",
        apelido: dados.apelido || "",
        nome: dados.nome || dados.nome_curso || "Treinamento",
        descricao: dados.descricao || "",
        carga: Number(dados.carga_horaria || dados.carga || 0),
        modalidade: dados.modalidade_padrao || dados.modalidade || "Presencial",
        valor: Number(dados.investimento_base || dados.valor || 0),
        secaoExibicao: String(dados.secaoExibicao || "grade").toLowerCase().trim(),
        ativo: dados.ativo !== undefined
            ? !!dados.ativo
            : String(dados.status || "ativo").toLowerCase() !== "inativo",
        excluido: !!dados.excluido
    };
}

/* =========================================================================
 * RENDERIZAÇÃO
 * ========================================================================= */

function renderizarCardGrade(curso) {
    // Usa apelido se existir, senão o nome completo
    const titulo = curso.apelido || curso.nome;
    const categoria = "TRENAMENTO";   // ou usar curso.apelido

    return `
        <div class="course-card visible" data-cat="${curso.codigo}">
            <div class="course-card-header">
                <div class="course-icon">⚡</div>
                <div class="course-nr">${curso.codigo}</div>
                <div class="course-title">${curso.nome}</div>
            </div>
            <div class="course-card-body">
                <p class="course-desc">${curso.descricao}</p>
                <div class="course-meta">
                    <span class="meta-item">⏱ ${curso.carga}h</span>
                    <span class="meta-item">📍 ${curso.modalidade}</span>
                    <span class="meta-item">🎓 Certificado</span>
                </div>
            </div>
            <div class="course-card-footer">
                <span class="course-price">${formatarMoeda(curso.valor)}</span>
                <button class="btn-card" onclick="scrollToContact()">Inscrever-se</button>
            </div>
        </div>
    `;
}

function renderizarCardNorma(curso) {
    const codigoExibicao = curso.codigo || "NR";

    return `
        <div class="col-10 col-md-6 col-lg-4 px-4 mb-5 nr-card">
            <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden card-hover-effect">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="mb-4">
                        <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-semibold border border-primary border-opacity-25 nr-code">
                            ${codigoExibicao}
                        </span>
                    </div>
                    <h5 class="card-title fw-bold text-dark mb-3 nr-title">
                        ${curso.nome}
                    </h5>
                    <p class="card-text text-secondary mb-4 nr-desc">
                        ${curso.descricao}
                    </p>
                    <div class="d-flex justify-content-between align-items-center mt-auto pt-3 border-top border-light">
                        <div class="text-start">
                            <small class="d-block text-muted fw-bold nr-label">
                                Investimento
                            </small>
                            <span class="fw-bold text-secondary nr-value">
                                ${formatarMoeda(curso.valor)}
                            </span>
                        </div>
                        <button class="btn btn-outline-primary px-4 py-2 fw-semibold rounded-3"
                                onclick="scrollToContact()">
                            Saiba mais
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/* =========================================================================
 * CARREGAMENTO PRINCIPAL
 * ========================================================================= */

async function carregarCatalogoDinamico(db) {
    const grid = document.getElementById("coursesGrid");
    const normasGrid = document.getElementById("normasGrid") || document.getElementById("nrsGrid");
    const selectCurso = document.getElementById("curso");

    if (!grid && !normasGrid) return;

    try {
        const querySnapshot = await getDocs(collection(db, "cursos"));

        if (querySnapshot.empty) {
            console.warn("⚠️ Nenhum curso encontrado na coleção /cursos");
            return;
        }

        let coursesHTML = "";
        let normasHTML = "";
        let optionsHTML = '<option value="">Selecione um curso...</option>';

        let totalGrade = 0;
        let totalNormas = 0;
        let totalIgnorados = 0;

        querySnapshot.forEach((docSnap) => {
            const dados = { id: docSnap.id, ...docSnap.data() };
            const curso = normalizarCurso(dados);

            // Ignora excluídos
            if (curso.excluido) { totalIgnorados++; return; }

            // Ignora inativos
            if (!curso.ativo) { totalIgnorados++; return; }

            // Ignora ocultos / internos
            if (curso.secaoExibicao === "oculto" ||
                curso.secaoExibicao === "rascunho" ||
                curso.secaoExibicao === "nao_exibir") {
                totalIgnorados++;
                return;
            }

            // Adiciona ao select do formulário
            optionsHTML += `<option value="${curso.nome}">${curso.nome}</option>`;

            // Renderiza conforme seção
            if (curso.secaoExibicao === "nr" || curso.secaoExibicao === "normas") {
                normasHTML += renderizarCardNorma(curso);
                totalNormas++;
            } else {
                coursesHTML += renderizarCardGrade(curso);
                totalGrade++;
            }
        });

        // Injeta no DOM
        if (grid) {
            grid.innerHTML = coursesHTML || "<p class='text-muted text-center w-100'>Nenhum curso na grade.</p>";
        }
        if (normasGrid) {
            normasGrid.innerHTML = normasHTML || "<p class='text-muted text-center w-100'>Nenhuma norma cadastrada.</p>";
        }
        if (selectCurso) {
            selectCurso.innerHTML = optionsHTML;
        }

        console.log(`✅ Catálogo carregado: ${totalGrade} na grade, ${totalNormas} em normas, ${totalIgnorados} ignorados.`);

    } catch (err) {
        console.error("❌ Erro ao carregar catálogo dinâmico do Firestore:", err);
    }
}

/* =========================================================================
 * BOOTSTRAP
 * ========================================================================= */

try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => carregarCatalogoDinamico(db));
    } else {
        carregarCatalogoDinamico(db);
    }

} catch (error) {
    console.error("❌ Erro ao inicializar o Firebase no loader:", error);
}