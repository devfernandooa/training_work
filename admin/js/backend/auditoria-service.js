import { auth, db } from "../firebase-config.js";
import {
  collection,
  addDoc,
  getDocs,
  orderBy,
  query,
  limit,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* ==========================================================================
 * RÓTULOS AMIGÁVEIS PARA CAMPOS DE AUDITORIA
 * ========================================================================== */
const ROTULOS_CAMPOS = {
  // Campos de Aluno / Lead
  nome: "Nome",
  email: "E-mail",
  cpf: "CPF",
  telefone: "Telefone",
  nascimento: "Data de Nascimento",
  status: "Status",
  observacoes: "Observações",
  "endereco.cep": "CEP",
  "endereco.logradouro": "Logradouro",
  "endereco.numero": "Número",
  "endereco.bairro": "Bairro",
  "endereco.cidade": "Cidade",
  "endereco.estado": "Estado (UF)",

  // Campos de Financeiro
  valor: "Valor do Curso",
  status_pagamento: "Status de Pagamento",
  modalidade_pagamento: "Forma de Pagamento",

  // Campos de Curso
  apelido: "Apelido",
  codigo: "Código",
  carga_horaria: "Carga Horária",
  investimento_base: "Valor do Curso",
  modalidade_padrao: "Modalidade",
  secaoExibicao: "Exibição no Site",
  descricao: "Descrição",
  ementa: "Ementa",
  ativo: "Status",
  instrutor_padrao: "Instrutor Padrão",
  dias_padrao: "Dias da Semana",
  horario_padrao: "Horário",
  turno_padrao: "Turno",

  // Campos de Turma
  vagas_maximas: "Vagas Máximas",
  instrutor: "Instrutor",
  horario: "Horário",
  dias_semana: "Dias da Semana",
  modalidade: "Modalidade",
  carga_horaria: "Carga Horária", // (se não existir ainda)
  codigo_turma: "Código da Turma",
  curso_nome: "Curso",
};

export function obterRotuloCampo(campo) {
  return ROTULOS_CAMPOS[campo] || campo;
}

console.log("✅ auditoria-service.js carregado");

export function compararAlteracoes(antes = {}, depois = {}) {
  const alteracoes = [];
  const ignorar = [
    "atualizado_em",
    "atualizado_por",
    "ultimaAlteracaoEm",
    "ultimaAlteracaoPor",
    "id",
    "uid",
    "endereco",
  ];

  Object.keys(depois).forEach((campo) => {
    if (ignorar.includes(campo)) return;
    if (campo === "endereco") return;

    const a = antes[campo];
    const b = depois[campo];

    if (JSON.stringify(a) !== JSON.stringify(b)) {
      alteracoes.push({
        campo,
        valor_anterior: a ?? null,
        valor_novo: b ?? null,
      });
    }
  });

  // Endereço (objeto aninhado) — só quando existir
  if (depois.endereco && antes.endereco) {
    Object.keys(depois.endereco).forEach((k) => {
      if (
        JSON.stringify(antes.endereco[k]) !== JSON.stringify(depois.endereco[k])
      ) {
        alteracoes.push({
          campo: `endereco.${k}`,
          valor_anterior: antes.endereco[k] ?? null,
          valor_novo: depois.endereco[k] ?? null,
        });
      }
    });
  }

  return alteracoes;
}

export async function registrarAuditoriaAluno(alunoId, dados) {
  if (!alunoId) throw new Error("ID obrigatório");
  const adminEmail = auth?.currentUser?.email || "Sistema";
  const payload = {
    tipo: dados.tipo || "alteracao",
    entidade: dados.entidade || "aluno",
    descricao: dados.descricao || "Alteração",
    campos_alterados: dados.campos_alterados || [],
    admin_email: adminEmail,
    criado_em: new Date().toISOString(),
  };
  const ref = collection(db, "alunos", alunoId, "auditoria");
  const d = await addDoc(ref, payload);
  return { id: d.id, ...payload };
}

export async function listarAuditoriaAluno(alunoId, limite = 20) {
  const ref = collection(db, "alunos", alunoId, "auditoria");
  const q = query(ref, orderBy("criado_em", "desc"), limit(limite));
  const snap = await getDocs(q);
  const logs = [];
  snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
  return logs;
}

/* ==========================================================================
 * AUDITORIA GENÉRICA (para qualquer coleção)
 * ==========================================================================
 * Uso:
 *   await registrarAuditoriaGenerica("financeiro", transacaoId, {
 *       tipo: "alteracao",
 *       descricao: "3 campo(s) alterado(s)",
 *       campos_alterados: [...]
 *   });
 * ========================================================================== */
export async function registrarAuditoriaGenerica(colecao, docId, dados) {
  if (!colecao || !docId)
    throw new Error("Coleção e ID obrigatórios para auditoria.");

  const adminEmail = auth?.currentUser?.email || "Sistema";

  const payload = {
    tipo: dados.tipo || "alteracao",
    entidade: dados.entidade || colecao,
    descricao: dados.descricao || "Alteração registrada",
    campos_alterados: dados.campos_alterados || [],
    admin_email: adminEmail,
    criado_em: new Date().toISOString(),
  };

  const ref = collection(db, colecao, docId, "auditoria");
  const docRef = await addDoc(ref, payload);
  return { id: docRef.id, ...payload };
}

/**
 * Lista os últimos N logs de auditoria de qualquer coleção.
 */
export async function listarAuditoriaGenerica(colecao, docId, limite = 20) {
  const ref = collection(db, colecao, docId, "auditoria");
  const q = query(ref, orderBy("criado_em", "desc"), limit(limite));
  const snap = await getDocs(q);

  const logs = [];
  snap.forEach((d) => logs.push({ id: d.id, ...d.data() }));
  return logs;
}
