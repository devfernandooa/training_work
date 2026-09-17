import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Suas credenciais públicas do Firebase
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

  // 1. Função para carregar os cursos gerais na home
  async function carregarCursosNaHome() {
    const grid = document.getElementById("coursesGrid");
    if (!grid) return;

    try {
      const querySnapshot = await getDocs(collection(db, "cursos"));
      grid.innerHTML = "";

      if (querySnapshot.empty) {
        grid.innerHTML = "<p style='color:#333; text-align:center; grid-column: 1/-1;'>Nenhum curso cadastrado no banco.</p>";
        return;
      }

      querySnapshot.forEach((doc) => {
        const curso = doc.data();

        // Se for da categoria "Normas NR", pulamos aqui pois elas vão para a própria seção delas
        if (curso.categoria === "Normas NR") return;

        const categoriaClass = curso.categoria ? curso.categoria.toLowerCase() : "geral";

        const card = document.createElement("div");
        card.className = "course-card visible";
        card.setAttribute("data-cat", categoriaClass);

        card.innerHTML = `
          <div class="course-card-header">
            <div class="course-icon">${curso.categoria === 'Telecomunicações' ? '📡' : '⚡'}</div>
            <div class="course-nr">${curso.categoria || 'Capacitação'}</div>
            <div class="course-title">${curso.nome}</div>
          </div>
          <div class="course-card-body">
            <p class="course-desc">${curso.descricao}</p>
            <div class="course-meta">
              <span class="meta-item">⏱ ${curso.carga_horaria || 0}h</span>
              <span class="meta-item">📍 Presencial</span>
              <span class="meta-item">🎓 Certificado</span>
            </div>
          </div>
          <div class="course-card-footer">
            <span class="course-price">R$ ${Number(curso.valor || 0).toFixed(2).replace('.', ',')}</span>
            <button class="btn-card" onclick="scrollToContact()">Inscrever-se</button>
          </div>
        `;
        grid.appendChild(card);
      });

    } catch (err) {
      console.error("Erro ao buscar documentos do Firestore:", err);
      grid.innerHTML = "<p style='color:red; text-align:center; grid-column: 1/-1;'>Erro ao carregar cursos do banco. Verifique o console.</p>";
    }
  }

  // 2. Função para carregar as Normas Regulamentadoras (Espaçamento reduzido e 3 por linha)
  async function carregarNormasNR() {
    const grid = document.getElementById("nrsGrid") || document.getElementById("normasGrid");
    if (!grid) return;

    try {
      const q = query(collection(db, "cursos"), where("categoria", "==", "Normas NR"));
      const querySnapshot = await getDocs(q);

      grid.innerHTML = "";

      if (querySnapshot.empty) {
        grid.innerHTML = "<p class='text-muted text-center w-100'>Nenhuma norma cadastrada.</p>";
        return;
      }

      let index = 1;
      querySnapshot.forEach((doc) => {
        const norma = doc.data();

        // Usamos col-lg-4 e px-1 para estreitar as margens laterais internas da coluna
        const colDiv = document.createElement("div");
        colDiv.className = "col-10 col-md-6 col-lg-4 px-4 mb-5 nr-card";

        const imagemUrl = `https://picsum.photos/seed/nr${index}/400/250`;
        index++;

        colDiv.innerHTML = `
          <div class="card h-100 shadow-sm border-0 rounded-4 overflow-hidden card-hover-effect" style="width: 26rem;">
            <div class="card-body d-flex flex-column justify-content-between p-3">
              <div>
                <span class="badge bg-primary bg-opacity-10 text-primary px-2 py-1 rounded-pill fw-semibold mb-4" style="font-size: 0.70rem;">
                  ${norma.sigla || 'NR'}
                </span>
                <h5 class="card-title fw-bold text-dark fs-6">${norma.nome}</h5>
                <p class="card-text text-secondary small mb-3" style="font-size: 0.98rem;">${norma.descricao}</p>
              </div>
              <button class="btn btn-outline-primary rounded fw-semibold" style="width: 160px" onclick="scrollToContact()">Saiba mais</button>
            </div>
          </div>
        `;
        grid.appendChild(colDiv);
      });

    } catch (error) {
      console.error("Erro ao carregar Normas NR:", error);
    }
  }

  carregarCursosNaHome();
  carregarNormasNR();
} catch (error) {
  console.error("Erro ao inicializar o Firebase:", error);
}