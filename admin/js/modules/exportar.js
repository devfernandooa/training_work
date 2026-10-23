import { listarAuditoriaGenerica, obterRotuloCampo } from "../backend/auditoria-service.js";

/**
 * Exporta dados para CSV.
 */
export function exportarCSV(dados, nomeArquivo = "relatorio") {
    if (!dados || dados.length === 0) {
        alert("Não há dados para exportar.");
        return;
    }

    const cabecalhos = Object.keys(dados[0]);
    const linhas = dados.map(obj => {
        return cabecalhos.map(campo => {
            let valor = obj[campo];
            if (typeof valor === "object" && valor !== null) valor = JSON.stringify(valor);
            const stringValor = String(valor ?? "").replace(/"/g, '""');
            return `"${stringValor}"`;
        }).join(";");
    });

    const conteudoCSV = "\uFEFF" + cabecalhos.join(";") + "\n" + linhas.join("\n");
    const blob = new Blob([conteudoCSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${nomeArquivo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Abre janela de impressão para salvar como PDF.
 */
export function exportarPDF(htmlConteudo, titulo = "Relatório") {
    const janela = window.open("", "_blank");
    if (!janela) {
        alert("Por favor, permita pop-ups para gerar o PDF.");
        return;
    }

    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>${titulo}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
                h1 { font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; font-weight: bold; }
                tr:nth-child(even) { background-color: #f9fafb; }
                .footer { margin-top: 30px; font-size: 10px; color: #888; text-align: center; }
            </style>
        </head>
        <body>
            <h1>${titulo}</h1>
            ${htmlConteudo}
            <div class="footer">Gerado em ${new Date().toLocaleString("pt-BR")} · TrainingWork</div>
            <script>window.onload = () => { window.print(); };</script>
        </body>
        </html>
    `);
    janela.document.close();
}

/**
 * Gera tabela HTML para o PDF.
 */
export function gerarTabelaHTML(dados, colunas) {
    if (!dados || dados.length === 0) return "<p>Nenhum dado encontrado.</p>";
    const cabecalhos = colunas.map(c => `<th>${c.rotulo}</th>`).join("");
    const linhas = dados.map(obj => {
        const tds = colunas.map(c => {
            let valor = obj[c.campo];
            if (typeof valor === "object" && valor !== null) valor = JSON.stringify(valor);
            return `<td>${String(valor ?? "")}</td>`;
        }).join("");
        return `<tr>${tds}</tr>`;
    }).join("");
    return `<table><thead><tr>${cabecalhos}</tr></thead><tbody>${linhas}</tbody></table>`;
}

/**
 * Busca os logs de auditoria de um documento e prepara para exportação.
 */
export async function prepararDadosAuditoria(colecao, docId) {
    const logs = await listarAuditoriaGenerica(colecao, docId, 100);
    
    if (!logs || logs.length === 0) return null;

    return logs.map(log => {
        let campos = "—";
        if (log.campos_alterados && log.campos_alterados.length > 0) {
            campos = log.campos_alterados.map(c => 
                `${obterRotuloCampo(c.campo)}: ${c.valor_anterior} → ${c.valor_novo}`
            ).join(" | ");
        }
        return {
            "Data/Hora": new Date(log.criado_em).toLocaleString("pt-BR"),
            "Admin": log.admin_email || "Sistema",
            "Tipo": log.tipo,
            "Descrição": log.descricao || "—",
            "Alterações": campos
        };
    });
}