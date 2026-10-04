import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";

// Credenciais oficiais do projeto Training Work
const firebaseConfig = {
  apiKey: "AIzaSyCmNDeSYpQNzlecPYr14lyw0dOqL3HVSdo",
  authDomain: "training-work.firebaseapp.com",
  projectId: "training-work",
  storageBucket: "training-work.firebasestorage.app",
  messagingSenderId: "727749084762",
  appId: "1:727749084762:web:e000dd84decbb7d577fa63",
  measurementId: "G-1H1VC22G15"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Leads 100% focados na área de Telecom e ISPs
const leadsData = [
  {
    "nome": "Roberto Sampaio (NetFibra Fsa)",
    "curso": "FTTH-01 - Projeto e Instalação de Redes FTTH",
    "email": "roberto.sampaio@netfibrafsa.com.br",
    "telefone": "(75) 98812-3456",
    "status": "novo",
    "prioridade": "Alta",
    "mensagem": "Técnico de fusão solicitando capacitação avançada em certificação de cabos e OTDR.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Camila Menezes (Sertão Telecom)",
    "curso": "WFI-02 - Configuração Avançada de Roteadores",
    "email": "camila.m@sertaotelecom.net.br",
    "telefone": "(75) 99145-8899",
    "status": "em_andamento",
    "prioridade": "Alta",
    "mensagem": "Supervisora de suporte N2 interessada em padronizar a configuração de CPEs Wi-Fi 6.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "João Marcos Oliveira (Global Net)",
    "curso": "NET-04 - Fundamentos de Redes IP",
    "email": "joao.marcos@globalnet-ba.com.br",
    "telefone": "(75) 98177-2233",
    "status": "proposta",
    "prioridade": "Média",
    "mensagem": "Instalador de campo buscando treinar em sub-redes IPv4 e CGNAT para melhoria de atendimento.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Fernanda Bastos (Conecta Feira)",
    "curso": "GPN-03 - Arquitetura e Configuração de Redes GPON",
    "email": "fbastos@conectafeira.com.br",
    "telefone": "(75) 99988-1122",
    "status": "novo",
    "prioridade": "Alta",
    "mensagem": "Analista de NOC querendo especializar-se na gestão e provisionamento de OLTs.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Carlos Eduardo Lima (FibraLink BA)",
    "curso": "ATR-05 - Sistemas de Aterramento para Torres",
    "email": "carlos.lima@fibralinkba.com.br",
    "telefone": "(75) 98733-5544",
    "status": "novo",
    "prioridade": "Média",
    "mensagem": "Responsável pela infraestrutura de POPs buscando normas de proteção contra surtos.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Marcos Vinícius Souza (Alpha Telecom)",
    "curso": "SUP-06 - Atendimento Técnico e Resolução de Conflitos",
    "email": "marcos.souza@alphatelecom.net",
    "telefone": "(75) 99211-7788",
    "status": "convertido",
    "prioridade": "Alta",
    "mensagem": "Coordenador de equipe externa fechando pacote de treinamento de campo para a equipa.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Patricia Nogueira (Starlight Provedor)",
    "curso": "NR35-02 - Segurança no Trabalho em Altura",
    "email": "patricia@starlightnet.com.br",
    "telefone": "(75) 98455-1234",
    "status": "novo",
    "prioridade": "Alta",
    "mensagem": "Técnica de lançamentos em postes necessitando de reciclagem e certificação em altura.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Silvio Almeida (Master Banda Larga)",
    "curso": "NR10-01 - Segurança em Instalações e Serviços em Eletricidade",
    "email": "salmeida@masterbandalarga.com.br",
    "telefone": "(75) 99122-6677",
    "status": "em_andamento",
    "prioridade": "Alta",
    "mensagem": "Eletricista de manutenção de POPs e fontes de alimentação exigindo certificação.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Hélio Pires (Nordeste Fibra)",
    "curso": "FTTH-01 - Projeto e Instalação de Redes FTTH",
    "email": "helio.pires@nordestefibra.net",
    "telefone": "(75) 98833-9900",
    "status": "proposta",
    "prioridade": "Média",
    "mensagem": "Provedor local buscando capacitar 4 novos técnicos recém-contratados.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Marcos Dantas (Portal Telecom Fsa)",
    "curso": "NET-04 - Fundamentos de Redes IP",
    "email": "dantas@portaltelecomfsa.com.br",
    "telefone": "(75) 99655-4433",
    "status": "novo",
    "prioridade": "Média",
    "mensagem": "Operador de suporte técnico à procura de curso prático de diagnóstico de rotas.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Luciana Ribeiro (Gigabyte Provedor)",
    "curso": "WFI-02 - Configuração Avançada de Roteadores",
    "email": "luciana@gigabyte.net.br",
    "telefone": "(75) 98111-2244",
    "status": "convertido",
    "prioridade": "Média",
    "mensagem": "Atendente de helpdesk avançado escalada para treinamento de roteamento residencial.",
    "criado_em": new Date().toISOString()
  },
  {
    "nome": "Beatriz Cardoso (Bahia Net Serviços)",
    "curso": "SUP-06 - Atendimento Técnico e Resolução de Conflitos",
    "email": "beatriz@bahianetservicos.com.br",
    "telefone": "(75) 99288-3311",
    "status": "novo",
    "prioridade": "Baixa",
    "mensagem": "Técnica de suporte interno querendo melhorar índices de resolução no primeiro contacto.",
    "criado_em": new Date().toISOString()
  }
];

async function executarImportacao() {
  try {
    const colRef = collection(db, "inscricoes");
    
    for (const lead of leadsData) {
      const docRef = await addDoc(colRef, lead);
      console.log(`Lead de telecom inserido com sucesso! ID: ${docRef.id}`);
    }
    
    console.log("Importação de leads do setor de Telecom concluída com sucesso!");
  } catch (error) {
    console.error("Erro ao importar os dados para o Firebase:", error);
  }
}

executarImportacao();