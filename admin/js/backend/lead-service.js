/**
 * =========================================================================
 * TRAINING WORK — SERVIÇO DE LEADS (lead-service.js)
 * =========================================================================
 *
 * Este arquivo é a "camada de serviço" dos leads.
 *
 * O QUE É UM SERVICE?
 * Um service só conversa com o Firestore (banco de dados).
 * Ele NÃO mexe em HTML, NÃO faz login, NÃO mostra mensagens.
 *
 * Pense num restaurante:
 *   - O SERVICE é o COZINHEIRO (só prepara os dados)
 *   - A UI (lead-ui.js) é o GARÇOM (leva os dados para a mesa/HTML)
 *   - O AUTH-GUARD é o PORTEIRO (verifica quem pode entrar)
 *
 * Cada um faz uma coisa. Isso deixa o código:
 *   - Mais fácil de testar
 *   - Mais fácil de entender
 *   - Mais fácil de reutilizar em outras telas
 *
 * COLEÇÃO: /leads
 * Estrutura de um lead:
 *   {
 *     nome, email, telefone,
 *     curso_interesse_id, curso_interesse_nome,
 *     status, origem, criado_em, excluido
 *   }
 *
 * FUNÇÕES EXPORTADAS (o que este arquivo oferece):
 *   - escutarLeads(callback)              → escuta a coleção em tempo real
 *   - obterLeads()                        → lê todos uma vez
 *   - atualizarStatusLead(id, novoStatus) → muda o status
 *   - salvarEdicaoLead(id, dados)         → atualiza campos
 *   - excluirLead(id)                     → marca como excluído (soft delete)
 * =========================================================================
 */

import { auth, db } from "../firebase-config.js";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    updateDoc,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Nome da coleção no Firestore.
// Colocamos numa constante porque, se um dia mudar, é só mudar AQUI.
const NOME_COLECAO = "leads";


/* ==========================================================================
 * ESCUTA EM TEMPO REAL
 * ==========================================================================
 *
 * "Escutar" significa: toda vez que um lead mudar no banco,
 * o Firestore chama nossa função de volta (callback).
 *
 * Isso permite atualizar a tela SEM o usuário precisar dar F5.
 * ========================================================================== */

/**
 * Escuta todos os leads não-excluídos em tempo real.
 *
 * @param {Function} callback — recebe o array de leads (mais recentes primeiro)
 * @returns {Function} — função para CANCELAR a escuta (importante!)
 */
export function escutarLeads(callback) {
    const colRef = collection(db, NOME_COLECAO);

    return onSnapshot(
        colRef,

        // SUCESSO: o Firestore mandou os dados
        (snapshot) => {
            const leads = [];

            snapshot.forEach((docSnap) => {
                const dados = docSnap.data();

                // Ignora leads "excluídos" (soft delete)
                if (dados.excluido) return;

                leads.push({ id: docSnap.id, ...dados });
            });

            // Ordena: mais recentes primeiro
            leads.sort((a, b) => {
                const tempoA = a.criado_em ? new Date(a.criado_em).getTime() : 0;
                const tempoB = b.criado_em ? new Date(b.criado_em).getTime() : 0;
                return tempoB - tempoA;
            });

            if (typeof callback === "function") callback(leads);
        },

        // ERRO: algo deu errado (ex.: sem permissão)
        (erro) => {
            console.error("❌ Erro ao escutar /leads:", erro);
            if (typeof callback === "function") callback([]);
        }
    );
}


/* ==========================================================================
 * LEITURA PONTUAL
 * ==========================================================================
 *
 * Diferente de "escutar", aqui a gente lê UMA VEZ e pronto.
 * Útil quando você só quer uma lista para exportar CSV, por exemplo.
 * ========================================================================== */

/**
 * Lê todos os leads uma única vez.
 *
 * @returns {Promise<Array>} — array de leads
 */
export async function obterLeads() {
    try {
        const snap = await getDocs(collection(db, NOME_COLECAO));
        const leads = [];

        snap.forEach((d) => {
            const dados = d.data();
            if (!dados.excluido) {
                leads.push({ id: d.id, ...dados });
            }
        });

        return leads;
    } catch (erro) {
        console.error("❌ Erro ao obter leads:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * ATUALIZAR STATUS DO LEAD
 * ==========================================================================
 *
 * Status possíveis (fluxo típico):
 *   "Novo" → "Em Contato" → "Qualificado" → "Convertido" ou "Perdido"
 * ========================================================================== */

/**
 * Atualiza o campo `status` de um lead.
 *
 * @param {string} id — ID do documento do lead
 * @param {string} novoStatus — ex.: "Em Contato", "Qualificado"
 */
export async function atualizarStatusLead(id, novoStatus) {
    try {
        await updateDoc(doc(db, NOME_COLECAO, id), {
            status: novoStatus,
            atualizado_em: new Date().toISOString(),
            // `?.` significa: se auth.currentUser for null, não quebra
            atualizado_por: auth.currentUser?.email || "Sistema"
        });
    } catch (erro) {
        console.error("❌ Erro ao atualizar status do lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * SALVAR EDIÇÃO COMPLETA
 * ==========================================================================
 *
 * Quando o admin edita vários campos de uma vez no modal.
 * ========================================================================== */

/**
 * Atualiza vários campos do lead de uma só vez.
 *
 * @param {string} id — ID do documento
 * @param {Object} dados — objeto com os campos a atualizar
 */
export async function salvarEdicaoLead(id, dados) {
    try {
        await updateDoc(doc(db, NOME_COLECAO, id), {
            ...dados,
            atualizado_em: new Date().toISOString(),
            atualizado_por: auth.currentUser?.email || "Sistema"
        });
    } catch (erro) {
        console.error("❌ Erro ao salvar edição do lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * BUSCAR UM LEAD POR ID
 * ==========================================================================
 *
 * Útil quando precisamos dos dados antes de abrir um modal de edição.
 * A UI chama esta função, recebe os dados e preenche o modal.
 * ========================================================================== */

/**
 * Busca um lead específico por ID.
 *
 * @param {string} id — ID do documento
 * @returns {Promise<Object|null>} — os dados do lead, ou null se não existir
 */
export async function obterLeadPorId(id) {
    try {
        const snap = await getDoc(doc(db, NOME_COLECAO, id));

        if (!snap.exists()) {
            console.warn("⚠️ Lead não encontrado:", id);
            return null;
        }

        return { id: snap.id, ...snap.data() };
    } catch (erro) {
        console.error("❌ Erro ao buscar lead:", erro);
        throw erro;
    }
}


/* ==========================================================================
 * EXCLUSÃO LÓGICA (SOFT DELETE)
 * ==========================================================================
 *
 * Em vez de APAGAR o documento, marcamos com `excluido: true`.
 * Assim:
 *   - O lead some da listagem
 *   - Mas o histórico fica preservado
 *   - Podemos "desfazer" se precisar
 * ========================================================================== */

/**
 * Marca um lead como excluído (não apaga de verdade).
 *
 * @param {string} id — ID do documento
 */
export async function excluirLead(id) {
    try {
        await updateDoc(doc(db, NOME_COLECAO, id), {
            excluido: true,
            atualizado_em: new Date().toISOString(),
            atualizado_por: auth.currentUser?.email || "Sistema"
        });
    } catch (erro) {
        console.error("❌ Erro ao excluir lead:", erro);
        throw erro;
    }
}