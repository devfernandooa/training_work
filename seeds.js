const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function popularBanco() {
  console.log("Iniciando a criação das coleções no Firestore...\n");

  // 1. Coleção: cursos
  const cursos = [
    {
      id: "nr10-basico",
      nome: "NR10 - Segurança em Instalações e Serviços em Eletricidade",
      slug: "nr10-basico",
      descricao: "Capacitação obrigatória para trabalhadores que interagem direta ou indiretamente com instalações elétricas e serviços com eletricidade, abrangendo medidas de controle de risco elétrico, normas de trabalho e primeiros socorros.",
      ementa: [
        "Introdução à segurança com eletricidade",
        "Riscos em instalações e serviços",
        "Medidas de controle do risco elétrico",
        "Normas e procedimentos de trabalho",
        "Proteção e combate a incêndios",
        "Primeiros socorros"
      ],
      carga_horaria: 40,
      valor: 280.00,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr35-trabalho-altura",
      nome: "NR35 - Trabalho em Altura",
      slug: "nr35-trabalho-altura",
      descricao: "Treinamento obrigatório para planejamento, organização e execução de trabalhos executados acima de 2,00 metros do nível inferior, com foco na proteção contra quedas.",
      ementa: [
        "Normas e regulamentos aplicáveis ao trabalho em altura",
        "Análise de Risco e condições impeditivas",
        "Equipamentos de Proteção Individual (EPI) e Coletiva (EPC)",
        "Sistemas, pontos de ancoragem e nós",
        "Condutas em situações de emergência e resgate"
      ],
      carga_horaria: 8,
      valor: 160.00,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr33-espaco-confinado",
      nome: "NR33 - Segurança em Espaços Confinados (Vigia e Trabalhador)",
      slug: "nr33-espaco-confinado",
      descricao: "Capacitação para reconhecimento, avaliação e controle de riscos em espaços não projetados para ocupação humana contínua com atmosfera potencialmente perigosa.",
      ementa: [
        "Definições e reconhecimento de espaços confinados",
        "Identificação de riscos e controle de atmosfera",
        "Permissão de Entrada e Trabalho (PET)",
        "Equipamentos de medição e resgate"
      ],
      carga_horaria: 16,
      valor: 220.00,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    }
  ];

  for (const curso of cursos) {
    const { id, ...dados } = curso;
    await db.collection("cursos").doc(id).set(dados);
    console.log(`[OK] Curso criado: ${dados.nome}`);
  }

  // 2. Coleção: administradores
  await db.collection("administradores").doc("admin-master").set({
    nome: "Administrador Geral",
    email: "admin@trainingwork.com.br",
    telefone: "759992849369",
    funcao: "admin",
    permissoes: {
      gerenciar_cursos: true,
      gerenciar_alunos: true,
      gerenciar_leads: true,
      gerenciar_usuarios: true
    },
    ativo: true,
    criado_em: FieldValue.serverTimestamp()
  });
  console.log("[OK] Administrador padrão criado");

  // 3. Coleção: alunos
  await db.collection("alunos").doc("aluno-inicial").set({
    nome: "Aluno Demonstração",
    cpf: "12345678900",
    email: "aluno.demo@trainingwork.com.br",
    telefone: "759992849369",
    empresa: "Training Work Treinamentos",
    status: "ativo",
    criado_em: FieldValue.serverTimestamp()
  });
  console.log("[OK] Coleção de alunos inicializada");

  // 4. Coleção: matriculas
  await db.collection("matriculas").doc("mat-2026-001").set({
    aluno_id: "aluno-inicial",
    aluno_nome: "Aluno Demonstração",
    aluno_telefone: "759992849369",
    aluno_email: "aluno.demo@trainingwork.com.br",
    curso_id: "nr10-basico",
    curso_nome: "NR10 - Segurança em Instalações e Serviços em Eletricidade",
    turma: "2026.2-TURMA-A",
    status_pagamento: "aprovado",
    status_matricula: "confirmada",
    notificacao_enviada: false,
    canal_notificacao: "whatsapp",
    data_envio_notificacao: null,
    data_matricula: FieldValue.serverTimestamp()
  });
  console.log("[OK] Coleção de matrículas inicializada");

  console.log("\nTodas as coleções foram criadas e estruturadas no Firestore com sucesso!");
  process.exit(0);
}

popularBanco().catch((err) => {
  console.error("Erro durante a execução do script:", err);
  process.exit(1);
});