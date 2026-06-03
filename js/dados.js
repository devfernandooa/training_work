
// ──────────────────────────────────────────
// 1. DADOS ESTÁTICOS (Simulando API)
// ──────────────────────────────────────────
const coursesData = [
  { id: 1, title: "Instalador de Internet por Fibra Óptica", category: "fibra", nr: "Certificação Profissional", icon: "🔦", duration: "40h", location: "Presencial", cert: "Certificado", price: "Consulte", desc: "Fundamentos de redes FTTH, identificação de cabos e conectores, fusão e medição de atenuação." },
  { id: 2, title: "Conectores de Fibra Óptica", category: "fibra", nr: "Montagem & Terminação", icon: "🔌", duration: "16h", location: "Presencial", cert: "Prático", price: "Consulte", desc: "Técnicas de polimento, inserção, limpeza e teste de conectores SC, LC, FC e ST." },
  { id: 3, title: "Segurança em Instalações Elétricas", category: "nr seguranca", nr: "NR-10", icon: "⚡", duration: "40h", location: "Presencial", cert: "Certificado", price: "Consulte", desc: "Habilitação para trabalho em instalações e serviços com eletricidade." },
  { id: 4, title: "Espaços Confinados", category: "nr seguranca", nr: "NR-33", icon: "🏗️", duration: "16h", location: "Presencial", cert: "Certificado", price: "Consulte", desc: "Treinamento para trabalhador autorizado, vigia e supervisor de espaços confinados." },
  { id: 5, title: "Trabalho em Altura", category: "nr seguranca", nr: "NR-35", icon: "🪜", duration: "8h", location: "Presencial", cert: "Certificado", price: "Consulte", desc: "Habilitação para atividades acima de 2m. Uso correto de EPIs e sistemas de proteção." },
  { id: 6, title: "APR – Análise Preliminar de Risco", category: "seguranca", nr: "Documento Técnico", icon: "📋", duration: "8h", location: "In Company", cert: "Certificado", price: "Consulte", desc: "Elaboração e aplicação de APR para identificação e controle de perigos." },
  { id: 7, title: "Programas de Saúde Ocupacional", category: "seguranca", nr: "PPRA / PCMSO", icon: "🩺", duration: "20h", location: "Presencial/EAD", cert: "Certificado", price: "Consulte", desc: "Elaboração e implementação do PPRA e PCMSO." },
  { id: 8, title: "Instalador de Internet Banda Larga", category: "internet fibra", nr: "Telecom / ISP", icon: "📡", duration: "32h", location: "Presencial", cert: "Prático", price: "Consulte", desc: "Configuração de roteadores, cabeamento estruturado, VLAN, FTTH e troubleshooting." }
];

const normasData = [
  { code: "NR-06", name: "Equipamentos de Proteção Individual – Uso e Gestão de EPIs" },
  { code: "NR-10", name: "Segurança em Instalações e Serviços com Eletricidade" },
  { code: "NR-17", name: "Ergonomia e Condições de Trabalho" },
  { code: "NR-33", name: "Segurança e Saúde em Espaços Confinados" },
  { code: "NR-35", name: "Trabalho em Altura – Autorização e Controle" },
  { code: "PPRA", name: "Programa de Prevenção de Riscos Ambientais" },
  { code: "PCMSO", name: "Programa de Controle Médico de Saúde Ocupacional" },
  { code: "APR", name: "Análise Preliminar de Risco – Gestão de Perigos" },
  { code: "NR-05", name: "CIPA – Comissão Interna de Prevenção de Acidentes" },
  { code: "NR-12", name: "Segurança no Trabalho em Máquinas e Equipamentos" }
];

const testimonialsData = [
  { name: "Ricardo Melo", role: "Técnico em Telecom – Salvador/BA", text: "O curso de NR-35 foi excelente. Saí com pleno domínio das técnicas de trabalho em altura.", stars: 5, avatar: "RM" },
  { name: "Juliana Souza", role: "Instaladora FTTH – Feira de Santana/BA", text: "Fiz o treinamento de fibra óptica e montagem de conectores. A parte prática é muito bem estruturada.", stars: 5, avatar: "JS" },
  { name: "Carlos Lima", role: "Gestor de Segurança – ISP Regional", text: "Empresa com quem contratei treinamento in company. Profissionalismo impecável.", stars: 5, avatar: "CL" },
  { name: "Paulo Figueiredo", role: "Eletricista Industrial – Alagoinhas/BA", text: "O curso de NR-10 superou minhas expectativas. Conteúdo completo e instrutores excelentes.", stars: 5, avatar: "PF" },
  { name: "Anderson Leal", role: "Instalador de Internet – Região Norte/BA", text: "Consegui meu primeiro emprego após o curso. O certificado é reconhecido pelas empresas.", stars: 5, avatar: "AL" },
  { name: "Maria Alves", role: "Engenheira de Segurança – Salvador/BA", text: "O curso de NR-10 elevou a segurança da minha equipe. Recomendo a todos.", stars: 5, avatar: "MA" },
  { name: "João Santos", role: "Coordenador Técnico – ISP Regional", text: "Treinamento in company com didática prática e objetiva. Excelente investimento.", stars: 5, avatar: "JS" }
];

const galleryData = [
  { type: "foto", url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80", label: "Treinamento de Fibra Óptica" },
  { type: "foto", url: "https://images.unsplash.com/photo-1535223289827-42f1e9919769?auto=format&fit=crop&w=900&q=80", label: "Aula Prática em Laboratório" },
  { type: "video", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", poster: "https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&w=900&q=80", label: "Vídeo de Instalador em Campo" },
  { type: "video", url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm", poster: "https://images.unsplash.com/photo-1581092795360-9bdbfd478d8a?auto=format&fit=crop&w=900&q=80", label: "Demonstração de Equipamento" }
];