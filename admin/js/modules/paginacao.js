/**
 * =========================================================================
 * COMPONENTE GLOBAL DE PAGINAÇÃO
 * =========================================================================
 * Uso:
 *   import { renderizarPaginacaoGlobal } from "../modules/paginacao.js";
 *   
 *   renderizarPaginacaoGlobal({
 *       totalPaginas: 5,
 *       paginaAtual: 1,
 *       totalItens: 44,
 *       indexInicio: 0,
 *       indexFim: 10,
 *       containerId: "paginacao-alunos",
 *       infoId: "info-paginacao-alunos",
 *       nomeItem: "alunos",
 *       onPageChange: (novaPagina) => {
 *           paginaAtual = novaPagina;
 *           renderizar();
 *       }
 *   });
 * =========================================================================
 */

export function renderizarPaginacaoGlobal({
    totalPaginas,
    paginaAtual,
    totalItens,
    indexInicio,
    indexFim,
    containerId,
    infoId,
    nomeItem = "itens",
    onPageChange
}) {
    const ul = document.getElementById(containerId);
    const info = document.getElementById(infoId);
    
    if (!ul) return;

    // 1. Atualiza o texto de "Mostrando X-Y de Z"
    if (info) {
        const fimExibido = Math.min(indexFim, totalItens);
        info.textContent = totalItens === 0 
            ? `Nenhum ${nomeItem} encontrado` 
            : `Mostrando ${indexInicio + 1}-${fimExibido} de ${totalItens} ${nomeItem}`;
    }

    // 2. Se só tiver 1 página, esconde os botões
    if (totalPaginas <= 1) {
        ul.innerHTML = "";
        return;
    }

    let html = "";

    // 3. Botão Anterior
    html += `<li class="page-item ${paginaAtual === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-pagina="${paginaAtual - 1}" aria-label="Anterior">
            <i class="fas fa-chevron-left"></i>
        </a>
    </li>`;

    // 4. Lógica de exibição das páginas (mostra 5 botões: atual, 2 antes, 2 depois)
    for (let i = 1; i <= totalPaginas; i++) {
        if (i === 1 || i === totalPaginas || (i >= paginaAtual - 1 && i <= paginaAtual + 1)) {
            html += `<li class="page-item ${paginaAtual === i ? 'active' : ''}">
                <a class="page-link" href="#" data-pagina="${i}">${i}</a>
            </li>`;
        } else if (i === paginaAtual - 2 || i === paginaAtual + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // 5. Botão Próxima
    html += `<li class="page-item ${paginaAtual === totalPaginas ? 'disabled' : ''}">
        <a class="page-link" href="#" data-pagina="${paginaAtual + 1}" aria-label="Próxima">
            <i class="fas fa-chevron-right"></i>
        </a>
    </li>`;

    ul.innerHTML = html;

    // 6. Adiciona o evento de clique
    ul.querySelectorAll(".page-link").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const novaPagina = parseInt(link.getAttribute("data-pagina"));
            
            // Só dispara se for uma página válida e diferente da atual
            if (novaPagina >= 1 && novaPagina <= totalPaginas && novaPagina !== paginaAtual) {
                if (typeof onPageChange === "function") {
                    onPageChange(novaPagina);
                }
            }
        });
    });
}