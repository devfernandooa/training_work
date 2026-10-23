import { auth, db } from "../firebase-config.js";
import { collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { prepararDadosAuditoria, exportarCSV, exportarPDF, gerarTabelaHTML } from "../modules/exportar.js";
import { notificar } from "../modules/notificacao.js";

const selectModulo = document.getElementById("selectModulo");
const selectRegistro = document.getElementById("selectRegistro");
const filtroDataInicial = document.getElementById("filtroDataInicial");
const filtroDataFinal = document.getElementById("filtroDataFinal");
const btnCSV = document.getElementById("btnExportarCSV");
const btnPDF = document.getElementById("btnExportarPDF");
const contador = document.getElementById("contadorRegistros");
const cardPrevia = document.getElementById("cardPrevia");
const previaThead = document.getElementById("previaThead");
const previaTbody = document.getElementById("previaTbody");

let dadosParaExportar = [];
let nomeArquivoBase = "relatorio";

/**
 * Carrega os registros do módulo selecionado.
 */
async function carregarRegistros(modulo) {
    selectRegistro.innerHTML = '<option value="">Carregando...</option>';
    selectRegistro.disabled = true;
    filtroDataInicial.disabled = true;
    filtroDataFinal.disabled = true;
    btnCSV.disabled = true;
    btnPDF.disabled = true;
    contador.textContent = "0 registros encontrados";
    cardPrevia.classList.add("d-none");
    dadosParaExportar = [];

    if (!modulo) return;

    try {
        const snap = await getDocs(collection(db, modulo));
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));

        let html = '<option value="">Selecione o registro...</option>';

        if (modulo === "financeiro") {
            // AGRUPAR POR ALUNO NO FINANCEIRO
            const alunosAgrupados = {};
            docs.forEach(d => {
                const alunoId = d.alunoId || d.aluno_id; // ID único do aluno
                if (!alunoId) return;
                
                // Se for a primeira vez que vemos esse aluno, guarda os dados
                if (!alunosAgrupados[alunoId]) {
                    alunosAgrupados[alunoId] = {
                        id: alunoId, // Usamos o ID do aluno para o relatório
                        nome: d.alunoNome || d.aluno_nome || "Aluno Desconhecido",
                        email: d.alunoEmail || d.aluno_email || d.email || ""
                    };
                }
            });

            // Converte de volta para array e ordena
            const listaAgrupada = Object.values(alunosAgrupados);
            listaAgrupada.sort((a, b) => a.nome.localeCompare(b.nome));

            listaAgrupada.forEach(a => {
                let label = a.nome;
                if (a.email) label += ` (${a.email})`;
                html += `<option value="${a.id}">${label}</option>`;
            });

        } else {
            // COMPORTAMENTO PADRÃO PARA OUTROS MÓDULOS
            docs.sort((a, b) => {
                const nomeA = a.nome || a.name || a.alunoNome || a.aluno_nome || a.curso_nome || a.id;
                const nomeB = b.nome || b.name || b.alunoNome || b.aluno_nome || b.curso_nome || b.id;
                return String(nomeA).localeCompare(String(nomeB));
            });

            docs.forEach(d => {
                let label = d.nome || d.name || d.alunoNome || d.aluno_nome || d.curso_nome || d.id;
                if (d.email) label += ` (${d.email})`;
                html += `<option value="${d.id}">${label}</option>`;
            });
        }

        selectRegistro.innerHTML = html;
        selectRegistro.disabled = false;
        filtroDataInicial.disabled = false;
        filtroDataFinal.disabled = false;

    } catch (err) {
        console.error("Erro ao carregar registros:", err);
        selectRegistro.innerHTML = '<option value="">Erro ao carregar</option>';
    }
}

/**
 * Prepara os dados (incluindo lógica 360º do financeiro).
 */
async function prepararExportacao() {
    const modulo = selectModulo.value;
    const docId = selectRegistro.value;

    if (!modulo || !docId) return;

    try {
        let dados = [];

        if (modulo === "auditoria_auth") {
            const snap = await getDocs(collection(db, "auditoria_auth"));
            snap.forEach(d => {
                const data = d.data();
                dados.push({
                    "Data/Hora": new Date(data.criado_em).toLocaleString("pt-BR"),
                    "Admin": data.admin_email || "—",
                    "Tipo": data.tipo,
                    "Descrição": data.descricao
                });
            });
                } else if (modulo === "financeiro") {
            // LÓGICA 360º: Pega todos os dados do Aluno e suas transações
            const alunoId = docId; // O docId agora é o ID do aluno
            
            // Busca dados do aluno
            const alunoSnap = await getDoc(doc(db, "alunos", alunoId));
            const aluno = alunoSnap.exists() ? alunoSnap.data() : {};

            // Busca TODAS as transações desse aluno
            const q = query(collection(db, "financeiro"), where("alunoId", "==", alunoId));
            const transacoesSnap = await getDocs(q);
            
            // Se não achou pelo alunoId, tenta pelo aluno_id
            let transacoes = [];
            transacoesSnap.forEach(t => transacoes.push(t.data()));
            
            if (transacoes.length === 0) {
                const q2 = query(collection(db, "financeiro"), where("aluno_id", "==", alunoId));
                const transacoesSnap2 = await getDocs(q2);
                transacoesSnap2.forEach(t => transacoes.push(t.data()));
            }

            // Dados cadastrais do Aluno
            dados.push({
                "Nome do Aluno": aluno.nome || "—",
                "E-mail": aluno.email || "—",
                "Telefone": aluno.telefone || "—",
                "Curso": "—",
                "Valor": "—",
                "Status": "—",
                "Forma Pgto": "—",
                "Criado em": "—"
            });

            // Adiciona as transações
            transacoes.forEach(t => {
                dados.push({
                    "Nome do Aluno": "",
                    "E-mail": "",
                    "Telefone": "",
                    "Curso": t.curso || "—",
                    "Valor": `R$ ${Number(t.valor).toFixed(2)}`,
                    "Status": t.status || "—",
                    "Forma Pgto": t.formaPagamento || "—",
                    "Criado em": t.criado_em ? new Date(t.criado_em).toLocaleString("pt-BR") : "—"
                });
            });
        } else {
            dados = await prepararDadosAuditoria(modulo, docId);
        }

        // Filtro de Data (aplicado se existir data no objeto)
        if (filtroDataInicial.value || filtroDataFinal.value) {
            dados = dados.filter(item => {
                const dataStr = item["Data/Hora"] || item["Criado em"];
                if (!dataStr) return true;
                const itemDate = new Date(dataStr.split(",")[0].split(" ")[0].split("/").reverse().join("-"));
                const start = filtroDataInicial.value ? new Date(filtroDataInicial.value) : new Date("1900-01-01");
                const end = filtroDataFinal.value ? new Date(filtroDataFinal.value) : new Date("2100-01-01");
                return itemDate >= start && itemDate <= end;
            });
        }

        dadosParaExportar = dados;

        if (dados.length === 0) {
            contador.textContent = "0 registros encontrados";
            cardPrevia.classList.add("d-none");
            return;
        }

        contador.textContent = `${dados.length} registros encontrados`;
        btnCSV.disabled = false;
        btnPDF.disabled = false;
        nomeArquivoBase = `relatorio_${modulo}_${docId}`;

        renderizarPrevia(dados);

    } catch (err) {
        console.error("Erro ao preparar exportação:", err);
        notificar("Erro ao buscar dados.", "erro");
    }
}

/**
 * Renderiza a prévia na tela.
 */
function renderizarPrevia(dados) {
    cardPrevia.classList.remove("d-none");
    previaThead.innerHTML = "";
    previaTbody.innerHTML = "";

    if (!dados || dados.length === 0) return;

    const chaves = Object.keys(dados[0]);

    // Cabeçalho
    chaves.forEach(k => {
        previaThead.innerHTML += `<th>${k}</th>`;
    });

    // Corpo
    dados.forEach(linha => {
        let tr = "<tr>";
        chaves.forEach(k => {
            // Converte o valor para string e evita quebra de objeto
            let valor = linha[k];
            if (typeof valor === "object" && valor !== null) {
                valor = JSON.stringify(valor);
            }
            tr += `<td style="white-space: normal; word-break: break-word;">${valor || "—"}</td>`;
        });
        tr += "</tr>";
        previaTbody.innerHTML += tr;
    });
}

/**
 * Gera o Cabeçalho de Auditoria para os arquivos.
 */
function gerarCabecalhoAuditoria() {
    const user = auth.currentUser;
    const dataHora = new Date().toLocaleString("pt-BR");
    const modulo = selectModulo.options[selectModulo.selectedIndex].text;
    const registro = selectRegistro.options[selectRegistro.selectedIndex].text;

    return [
        { "Relatório": `Auditoria de ${modulo} - ${registro}` },
        { "Gerado por": user ? user.email : "Desconhecido" },
        { "Data/Hora": dataHora },
        { "Filtro Data Inicial": filtroDataInicial.value || "Sem filtro" },
        { "Filtro Data Final": filtroDataFinal.value || "Sem filtro" },
        { "---": "---" }
    ];
}

/**
 * Eventos
 */
selectModulo.addEventListener("change", (e) => carregarRegistros(e.target.value));
selectRegistro.addEventListener("change", prepararExportacao);
filtroDataInicial.addEventListener("change", prepararExportacao);
filtroDataFinal.addEventListener("change", prepararExportacao);

btnCSV.addEventListener("click", () => {
    if (dadosParaExportar.length === 0) return;
    const cabecalho = gerarCabecalhoAuditoria();
    exportarCSV([...cabecalho, ...dadosParaExportar], nomeArquivoBase);
});

// btnPDF.addEventListener("click", () => {
//     if (dadosParaExportar.length === 0) return;
//     const cabecalho = gerarCabecalhoAuditoria();
//     const colunas = Object.keys(dadosParaExportar[0]).map(k => ({ campo: k, rotulo: k }));
//     const tabela = gerarTabelaHTML([...cabecalho, ...dadosParaExportar], colunas);
//     exportarPDF(tabela, `Relatório de ${selectModulo.value}`);
// });

btnPDF.addEventListener("click", () => {
    if (dadosParaExportar.length === 0) return;

    // 1. Pega o elemento da prévia
    const elementoPrevia = document.getElementById("cardPrevia");

    // 2. Configurações do PDF
    const opcoes = {
        margin: 10,
        filename: `${nomeArquivoBase}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 3. Gera e baixa o PDF
    // Adiciona uma classe temporária para garantir que a prévia esteja visível na hora do "print"
    elementoPrevia.classList.remove("d-none");

    html2pdf().set(opcoes).from(elementoPrevia).save().then(() => {
        // Opcional: Se quiser esconder a prévia depois de gerar o PDF (se ela não estava visível antes)
        // elementoPrevia.classList.add("d-none"); 
    });
});