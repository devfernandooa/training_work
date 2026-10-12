// ==========================================================================
// TRAINING WORK — SERVICE DE CERTIFICADO
// ==========================================================================

import {
    doc,
    updateDoc,
    arrayUnion
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { db } from "../firebase-config.js";
import { calcularFrequenciaMatricula } from "./calculo-frequencia-service.js";

/**
 * Gera código único de certificado.
 * Ex: TW-2026-0001-A3B9
 */
function gerarCodigoCertificado(ano, sequencial) {
    const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TW-${ano}-${String(sequencial).padStart(4, "0")}-${hash}`;
}

/**
 * Verifica se uma matrícula está apta a emitir certificado.
 */
export async function verificarAptidao(alunoId, matriculaId) {
    const freq = await calcularFrequenciaMatricula(alunoId, matriculaId);
    return freq;
}

/**
 * Emite o certificado (salva os campos no Firestore).
 * ⚠️ Geração do PDF fica pra Fase 3.
 */
export async function emitirCertificado(alunoId, matriculaId, dadosCertificado) {
    const freq = await calcularFrequenciaMatricula(alunoId, matriculaId);

    if (!freq.apto_certificado) {
        throw new Error(
            `Aluno não está apto. Frequência: ${freq.frequencia_final}% (mínimo: 75%)`
        );
    }

    const agora = new Date().toISOString();
    const ano = new Date().getFullYear();
    const sequencial = Math.floor(Math.random() * 9000) + 1000; // temporário
    const codigo = gerarCodigoCertificado(ano, sequencial);

    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);

    await updateDoc(ref, {
        frequencia_final: freq.frequencia_final,
        total_aulas: freq.total_aulas,
        presencas: freq.presencas,
        ausencias: freq.ausencias,
        justificadas: freq.justificadas,
        apto_certificado: true,

        certificado_emitido: true,
        certificado_codigo: codigo,
        certificado_url: dadosCertificado?.url || null,
        certificado_emitido_em: agora,
        certificado_emitido_por: dadosCertificado?.admin_email || "Sistema",
        atualizado_em: agora
    });

    return {
        codigo,
        frequencia: freq,
        emitido_em: agora
    };
}

/**
 * Reemite o certificado (registra no histórico).
 */
export async function reemitirCertificado(alunoId, matriculaId, motivo, adminEmail) {
    const agora = new Date().toISOString();
    const ano = new Date().getFullYear();
    const sequencial = Math.floor(Math.random() * 9000) + 1000;
    const novoCodigo = gerarCodigoCertificado(ano, sequencial);

    const ref = doc(db, "alunos", alunoId, "matriculas", matriculaId);

    await updateDoc(ref, {
        certificado_codigo: novoCodigo,
        certificado_emitido_em: agora,
        certificado_emitido_por: adminEmail || "Sistema",
        certificado_reemissoes: arrayUnion({
            motivo: motivo || "Reemissão",
            codigo_anterior: null, // preencher na Fase 3
            codigo_novo: novoCodigo,
            emitido_em: agora,
            emitido_por: adminEmail || "Sistema"
        }),
        atualizado_em: agora
    });

    return { codigo: novoCodigo, emitido_em: agora };
}