const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function popularBanco() {
  console.log("Iniciando a criação das coleções no Firestore para a Training Work...\n");

  // 1. Coleção: cursos (Incluindo NRs, FTTH e Instalador de Internet)
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
      categoria: "Segurança do Trabalho",
      destaque_home: true,
      ordem_exibicao: 1,
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
      categoria: "Segurança do Trabalho",
      destaque_home: true,
      ordem_exibicao: 2,
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
      categoria: "Segurança do Trabalho",
      destaque_home: true,
      ordem_exibicao: 3,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "ftth-projetista-instalador",
      nome: "Formação Completa em Redes FTTH (Fibra Óptica)",
      slug: "ftth-projetista-instalador",
      descricao: "Treinamento prático voltado para provedores de internet (ISPs). Aprenda fusão de fibra óptica, conectorização, DIO, OLTs, CTOs e certificação de redes ópticas.",
      ementa: [
        "Fundamentos de Fibras Ópticas e Tipos de Cabos",
        "Uso de Máquina de Fusão e Clivador",
        "Organização de DIO, Cúmpulas e CTOs",
        "Configuração Inicial de OLTs e ONU/ONT",
        "Medições com OTDR e Power Meter"
      ],
      carga_horaria: 40,
      valor: 597.00,
      categoria: "Telecomunicações",
      destaque_home: true,
      ordem_exibicao: 4,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "instalador-internet-isp",
      nome: "Instalador e Reparador de Redes de Internet para ISPs",
      slug: "instalador-internet-isp",
      descricao: "Capacitação essencial para novos profissionais de campo em provedores de internet, focando em cabeamento UTP, Wi-Fi avançado, roteadores e atendimento ao cliente.",
      ementa: [
        "Cabeamento Estruturado e Conectorização RJ45",
        "Configuração de Roteadores Wi-Fi (2.4GHz e 5GHz / Mesh)",
        "Diagnóstico de Falhas de Conexão e Lançamento de Cabo Drop",
        "Boas Práticas de Atendimento e Segurança em Campo"
      ],
      carga_horaria: 30,
      valor: 397.00,
      categoria: "Telecomunicações",
      destaque_home: true,
      ordem_exibicao: 5,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },

    {
      id: "nr06-epi",
      nome: "NR-06 - Equipamentos de Proteção Individual",
      sigla: "NR-06",
      slug: "nr06-epi",
      categoria: "Normas NR",
      descricao: "Uso e Gestão de EPIs conforme as exigências legais.",
      carga_horaria: 8,
      valor: 150.00,
      destaque_home: true,
      ordem_exibicao: 1,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr10-norma",
      nome: "NR-10 - Segurança em Instalações e Serviços com Eletricidade",
      sigla: "NR-10",
      slug: "nr10-norma",
      categoria: "Normas NR",
      descricao: "Habilitação para trabalho em instalações e serviços com eletricidade.",
      carga_horaria: 40,
      valor: 350.00,
      destaque_home: true,
      ordem_exibicao: 2,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr17-ergonomia",
      nome: "NR-17 - Ergonomia e Condições de Trabalho",
      sigla: "NR-17",
      slug: "nr17-ergonomia",
      categoria: "Normas NR",
      descricao: "Ergonomia e Adaptação das condições de trabalho.",
      carga_horaria: 8,
      valor: 150.00,
      destaque_home: true,
      ordem_exibicao: 3,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr33-espacos",
      nome: "NR-33 - Segurança e Saúde em Espaços Confinados",
      sigla: "NR-33",
      slug: "nr33-espacos",
      categoria: "Normas NR",
      descricao: "Treinamento para trabalhador autorizado, vigia e supervisor.",
      carga_horaria: 16,
      valor: 280.00,
      destaque_home: true,
      ordem_exibicao: 4,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr35-altura",
      nome: "NR-35 - Trabalho em Altura",
      sigla: "NR-35",
      slug: "nr35-altura",
      categoria: "Normas NR",
      descricao: "Autorização e controle para atividades acima de 2 metros.",
      carga_horaria: 8,
      valor: 200.00,
      destaque_home: true,
      ordem_exibicao: 5,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "pgr-gerenciamento",
      nome: "PGR - Programa de Prevenção de Riscos Ambientais",
      sigla: "PGR",
      slug: "pgr-gerenciamento",
      categoria: "Normas NR",
      descricao: "Programa de Gerenciamento de Riscos ocupacionais.",
      carga_horaria: 12,
      valor: 300.00,
      destaque_home: true,
      ordem_exibicao: 6,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "pcmso-saude",
      nome: "PCMSO - Programa de Controle Médico",
      sigla: "PCMSO",
      slug: "pcmso-saude",
      categoria: "Normas NR",
      descricao: "Programa de Controle Médico de Saúde Ocupacional.",
      carga_horaria: 12,
      valor: 300.00,
      destaque_home: true,
      ordem_exibicao: 7,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "apr-analise",
      nome: "APR - Análise Preliminar de Risco",
      sigla: "APR",
      slug: "apr-analise",
      categoria: "Normas NR",
      descricao: "Gestão e identificação antecipada de perigos.",
      carga_horaria: 8,
      valor: 180.00,
      destaque_home: true,
      ordem_exibicao: 8,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr05-cipa",
      nome: "NR-05 - CIPA",
      sigla: "NR-05",
      slug: "nr05-cipa",
      categoria: "Normas NR",
      descricao: "Comissão Interna de Prevenção de Acidentes e Assédio.",
      carga_horaria: 20,
      valor: 220.00,
      destaque_home: true,
      ordem_exibicao: 9,
      status: "ativo",
      criado_em: FieldValue.serverTimestamp()
    },
    {
      id: "nr12-maquinas",
      nome: "NR-12 - Segurança no Trabalho em Máquinas",
      sigla: "NR-12",
      slug: "nr12-maquinas",
      categoria: "Normas NR",
      descricao: "Segurança na operação de máquinas e equipamentos.",
      carga_horaria: 16,
      valor: 280.00,
      destaque_home: true,
      ordem_exibicao: 10,
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
      gerenciar_usuarios: true,
      gerenciar_financeiro: true
    },
    ativo: true,
    criado_em: FieldValue.serverTimestamp()
  });
  console.log("[OK] Administrador padrão criado");

  // 3. Coleção: alunos (Dados mais completos e realistas)
  await db.collection("alunos").doc("aluno-inicial").set({
    nome: "Carlos Eduardo da Silva",
    cpf: "123.456.789-00",
    rg: "12.345.678-9",
    email: "carlos.eduardo@email.com",
    telefone: "75988112233",
    data_nascimento: "1992-05-14",
    endereco: {
      cep: "44001-000",
      logradouro: "Rua Direta de São José",
      numero: "150",
      bairro: "Centro",
      cidade: "Feira de Santana",
      estado: "BA"
    },
    empresa: "Provedor Conecta Bahia",
    cargo: "Instalador de FTTH",
    status: "ativo",
    criado_em: FieldValue.serverTimestamp()
  });
  console.log("[OK] Coleção de alunos inicializada com dados completos");

  // 4. Coleção: matriculas
  await db.collection("matriculas").doc("mat-2026-001").set({
    aluno_id: "aluno-inicial",
    aluno_nome: "Carlos Eduardo da Silva",
    aluno_telefone: "75988112233",
    aluno_email: "carlos.eduardo@email.com",
    curso_id: "ftth-projetista-instalador",
    curso_nome: "Formação Completa em Redes FTTH (Fibra Óptica)",
    turma: "2026.2-TURMA-FTTH-A",
    valor_contratado: 597.00,
    status_pagamento: "aprovado",
    status_matricula: "confirmada",
    notificacao_enviada: true,
    canal_notificacao: "whatsapp",
    data_envio_notificacao: FieldValue.serverTimestamp(),
    data_matricula: FieldValue.serverTimestamp()
  });
  console.log("[OK] Coleção de matrículas inicializada");

  // 5. Nova Coleção: transacoes (Módulo Financeiro e Fluxo de Caixa)
  await db.collection("transacoes").doc("tx-2026-001").set({
    tipo: "receita", // 'receita' ou 'despesa'
    descricao: "Matrícula - Formação FTTH (Carlos Eduardo)",
    categoria: "Venda de Curso", // Venda de Curso, Material Didático, Manutenção de Equipamentos, Despesa Operacional
    valor: 597.00,
    forma_pagamento: "Pix", // Pix, Cartão de Crédito, Boleto, Dinheiro
    status: "pago", // pago, pendente, cancelado
    aluno_id: "aluno-inicial",
    matricula_id: "mat-2026-001",
    data_vencimento: "2026-09-04",
    data_pagamento: "2026-09-04",
    criado_em: FieldValue.serverTimestamp()
  });

  // Exemplo de despesa operacional padrão para compor o fluxo de caixa
  await db.collection("transacoes").doc("tx-2026-002").set({
    tipo: "despesa",
    descricao: "Aquisição de Bobinas de Fibra e Conectores para Aula Prática",
    categoria: "Material de Treinamento",
    valor: 350.00,
    forma_pagamento: "Boleto",
    status: "pago",
    aluno_id: null,
    matricula_id: null,
    data_vencimento: "2026-09-02",
    data_pagamento: "2026-09-02",
    criado_em: FieldValue.serverTimestamp()
  });

  console.log("[OK] Coleção de transações (Financeiro / Fluxo de Caixa) inicializada");

  console.log("\nTodas as coleções do Training Work foram criadas e estruturadas no Firestore com sucesso!");
  process.exit(0);
}

popularBanco().catch((err) => {
  console.error("Erro durante a execução do script:", err);
  process.exit(1);
});