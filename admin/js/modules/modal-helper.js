/**
 * =========================================================================
 * TRAINING WORK — HELPER DE MODAIS (Ajuste de Sidebar e Backdrop)
 * =========================================================================
 * Garante que o modal não cubra a sidebar e que o backdrop acompanhe.
 */

const LARGURA_SIDEBAR = 260; // Ajuste aqui se a sidebar for diferente

document.addEventListener("DOMContentLoaded", () => {
    // Escuta o evento global de "modal abrindo"
    document.body.addEventListener('show.bs.modal', function (event) {
        const modal = event.target;
        
        // Se for uma tela grande (desktop)
        if (window.innerWidth >= 992) {
            // 1. Ajusta o container do modal
            modal.style.paddingLeft = `${LARGURA_SIDEBAR}px`;
            
            // 2. Ajusta o dialog para centralizar no espaço restante
            const dialog = modal.querySelector('.modal-dialog');
            if (dialog) {
                dialog.style.margin = '0 auto';
                dialog.style.maxWidth = '1140px';
                dialog.style.width = 'calc(100% - 40px)';
            }
        }
    });

    // Escuta o evento de "modal abrindo" para arrumar o backdrop
    document.body.addEventListener('show.bs.modal', function () {
        // O Bootstrap cria o backdrop um pouco depois do evento, então esperamos 10ms
        setTimeout(() => {
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop && window.innerWidth >= 992) {
                backdrop.style.left = `${LARGURA_SIDEBAR}px`;
                backdrop.style.width = `calc(100vw - ${LARGURA_SIDEBAR}px)`;
            }
        }, 10);
    });
});

document.addEventListener('click', (e) => {
    // Apenas no mobile/tablet
    if (window.innerWidth >= 992) return;

    const tdAluno = e.target.closest('td[data-label="Aluno"]');
    if (!tdAluno) return;

    const tr = tdAluno.closest('tr');
    if (tr) {
        tr.classList.toggle('aberto');
    }
});