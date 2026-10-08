/**
 * =========================================================================
 * TRAINING WORK - SEEDER (seed.js)
 * =========================================================================
 * Popula o Firestore com dados de demonstração.
 *
 * Uso:
 *   import { rodarSeedCompleto } from "./js/backend/seed.js";
 *   await rodarSeedCompleto({ limparAntes: true });
 *
 * Coleções criadas:
 *   - administradores (3)
 *   - empresas (15)
 *   - cursos (25, com campo `apelido`)
 *   - turmas (10)
 *   - alunos (30)
 *   - turmas/{id}/matriculas/* (30, subcoleções)
 *   - leads (40 leads do site)
 *   - financeiro (25)
 * =========================================================================
 */

import { db } from "../firebase-config.js";
import {
    collection,
    collectionGroup,
    doc,
    getDocs,
    setDoc,
    writeBatch
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

/* =========================================================================
 * UTILITÁRIOS INTERNOS
 * ========================================================================= */

const log = (msg) => console.log(msg);

async function limparColecao(nomeColecao) {
    const snap = await getDocs(collection(db, nomeColecao));
    if (snap.size === 0) return 0;

    let deletados = 0;
    const docs = snap.docs;

    for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        const fatia = docs.slice(i, i + 400);
        fatia.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletados += fatia.length;
    }
    return deletados;
}

async function limparSubcolecoesMatriculas() {
    // ✅ AGORA SIM: lê "matriculas"
    const snap = await getDocs(collectionGroup(db, "matriculas"));
    if (snap.size === 0) return 0;

    let deletados = 0;
    const docs = snap.docs;

    for (let i = 0; i < docs.length; i += 400) {
        const batch = writeBatch(db);
        const fatia = docs.slice(i, i + 400);
        fatia.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deletados += fatia.length;
    }
    return deletados;
}

async function limparTudo() {
    log("🧹 Limpando coleções antigas...");

    const colecoesRaiz = [
        "administradores",
        "empresas",
        "cursos",
        "turmas",
        "alunos",
        "leads",
        "financeiro"
    ];

    // 1. Limpa subcoleções matriculas (novo nome)
    const subsRemovidas = await limparSubcolecoesMatriculas();
    log(`   🗑️ Subcoleções matriculas: ${subsRemovidas} removidas`);

    // 2. Limpa coleções raiz
    for (const nome of colecoesRaiz) {
        const n = await limparColecao(nome);
        log(`   🗑️ ${nome}: ${n} removidos`);
    }
}

/* =========================================================================
 * DADOS BASE
 * ========================================================================= */

const ANO_ATUAL = new Date().getFullYear();

const ADMINISTRADORES = [
    { id: "admin_01", nome: "Administrador Geral", email: "admin@trainingwork.com.br", papel: "Administrador" },
    { id: "admin_02", nome: "Fernando OAR", email: "fernandooar@gmail.com", papel: "Administrador" },
    { id: "admin_03", nome: "Gestão Acadêmica", email: "academico@trainingwork.com.br", papel: "Gestor" }
];

const EMPRESAS_NOMES = [
    "FiberMaster Telecom", "Conecta Feira Redes", "NetSul Provedor", "SegurPro Engenharia",
    "Sertão Telecom", "Bahia Link Fibra", "InfraTech Soluções", "EletroRedes Brasil",
    "Veloce Fibra Óptica", "Telecom Feira de Santana", "Alfa Redes & Segurança", "Leste Connect",
    "Redes & Cia Consultoria", "TopFibra Engenharia", "Provedor Portal da Cidade"
];

/**
 * Catálogo de cursos com apelido curto.
 * O `apelido` é usado para gerar o "nome de exibição" das turmas
 * nos dropdowns e tabelas (ex.: "GPON (TRW-GPN01-2026/001)").
 */
const CURSOS_BASE = [
    { codigo: "TRW-GPN01", apelido: "GPON", nome: "Arquitetura e Configuração de Redes GPON e EPON", carga: 48, preco: 480 },
    { codigo: "TRW-NR3501", apelido: "NR-35", nome: "NR-35 Segurança no Trabalho em Altura", carga: 16, preco: 250 },
    { codigo: "TRW-NR1001", apelido: "NR-10", nome: "NR-10 Segurança em Instalações Elétricas", carga: 40, preco: 380 },
    { codigo: "TRW-FTTH01", apelido: "FTTH", nome: "Projeto e Instalação de Redes FTTH em Campo", carga: 40, preco: 450 },
    { codigo: "TRW-WFI01", apelido: "Wi-Fi", nome: "Configuração Avançada de Roteadores Wi-Fi", carga: 24, preco: 220 },
    { codigo: "TRW-NR0501", apelido: "CIPA", nome: "Comissão Interna de Prevenção de Acidentes - CIPA", carga: 20, preco: 280 },
    { codigo: "TRW-NR0601", apelido: "NR-06", nome: "Equipamentos de Proteção Individual - EPI", carga: 8, preco: 150 },
    { codigo: "TRW-NR1701", apelido: "NR-17", nome: "Ergonomia no Trabalho de Escritório e Operacional", carga: 8, preco: 150 },
    { codigo: "TRW-SUP01", apelido: "Atendimento", nome: "Atendimento Técnico e Resolução de Conflitos", carga: 16, preco: 190 },
    { codigo: "TRW-FUS01", apelido: "Fusão", nome: "Técnicas de Fusão e Emenda de Fibra Óptica", carga: 32, preco: 520 },
    { codigo: "TRW-MKT01", apelido: "MikroTik", nome: "Configuração Básica RouterOS MikroTik", carga: 24, preco: 350 },
    { codigo: "TRW-MKT02", apelido: "BGP", nome: "Roteamento Avançado e BGP com MikroTik", carga: 40, preco: 600 },
    { codigo: "TRW-LNX01", apelido: "Linux", nome: "Administração de Servidores Linux para Provedores", carga: 48, preco: 490 },
    { codigo: "TRW-CAB01", apelido: "Cabeamento", nome: "Cabeamento Estruturado e Certificação de Redes", carga: 32, preco: 390 },
    { codigo: "TRW-SOL01", apelido: "Solar", nome: "Instalação e Dimensionamento de Sistemas Fotovoltaicos", carga: 40, preco: 650 },
    { codigo: "TRW-NR3301", apelido: "NR-33", nome: "NR-33 Segurança em Espaços Confinados", carga: 16, preco: 290 },
    { codigo: "TRW-AUT01", apelido: "IoT", nome: "Automação Residencial e IoT para Instaladores", carga: 24, preco: 310 },
    { codigo: "TRW-CFTV01", apelido: "CFTV", nome: "Instalação e Configuração de Câmeras IP e CFTV", carga: 20, preco: 260 },
    { codigo: "TRW-NET01", apelido: "Redes", nome: "Fundamentos de Redes IPv4 e IPv6", carga: 32, preco: 320 },
    { codigo: "TRW-MON01", apelido: "Zabbix", nome: "Monitoramento de Infraestrutura com Zabbix", carga: 32, preco: 410 },
    { codigo: "TRW-GEST01", apelido: "Gestão", nome: "Gestão Operacional de Equipes de Campo em Telecom", carga: 16, preco: 270 },
    { codigo: "TRW-FIS01", apelido: "OTDR", nome: "Medição de Fibra Óptica com OTDR e Power Meter", carga: 16, preco: 340 },
    { codigo: "TRW-NR1201", apelido: "NR-12", nome: "NR-12 Segurança em Máquinas e Equipamentos", carga: 24, preco: 330 },
    { codigo: "TRW-VEN01", apelido: "Vendas", nome: "Vendas Técnicas e Prospecção para Telecom", carga: 16, preco: 180 },
    { codigo: "TRW-QUAL01", apelido: "Qualidade", nome: "Garantia da Qualidade na Prestação de Serviços de Rede", carga: 12, preco: 160 }
];

const INSTRUTORES = [
    "Eng. Carlos Eduardo Silva", "Marcos Vinícius Segurança", "Ana Paula Ribeiro",
    "Rafael Mendes Costa", "Dra. Juliana Mendes", "Carlos Eduardo Souza"
];

const NOMES_ALUNOS = [
    "Carlos Eduardo Lima", "Thiago Araujo", "Felipe Morais", "Hélio Pires", "Roberto Sampaio Neto",
    "Marcelo Farias", "Vanessa Guimarães", "Rodrigo Pinho", "Fernanda Bastos", "Leonardo Bastos",
    "Camila Menezes", "Patricia Souza", "Gabriel Almeida", "Lucas Santos", "Juliana Paes",
    "Marcos Oliveira", "Aline Castro", "Bruno Ferreira", "Diego Rocha", "Mariana Costa",
    "Renato Augusto", "Beatriz Lima", "Gustavo Henrique", "Larissa Manoela", "Thiago Silva",
    "Carla Perez", "Daniel Dantas", "Amanda Silva", "Erick Jacquin", "Priscila Fantin"
];

const STATUS_LEADS = ["Novo", "Em Contato", "Qualificado", "Convertido", "Perdido"];

/* =========================================================================
 * SEEDER — FUNÇÃO PRINCIPAL
 * ========================================================================= */

export async function rodarSeedCompleto(opts = {}) {
    const { limparAntes = false } = opts;

    log("🚀 Iniciando seed completo (Padrão TRW)...");

    try {
        /* --------------------------------------------------------------
         * 0. LIMPEZA (opcional)
         * ------------------------------------------------------------ */
        if (limparAntes) {
            await limparTudo();
        }

        /* --------------------------------------------------------------
         * 1. ADMINISTRADORES
         * ------------------------------------------------------------ */
        log("👤 Populando /administradores...");
        for (const adm of ADMINISTRADORES) {
            await setDoc(doc(db, "administradores", adm.id), {
                ...adm,
                ativo: true,
                criado_em: new Date().toISOString()
            });
        }
        log(`   ✅ ${ADMINISTRADORES.length} administradores`);

        /* --------------------------------------------------------------
         * 2. EMPRESAS
         * ------------------------------------------------------------ */
        log("🏢 Populando /empresas...");
        const empresas = [];
        for (let i = 0; i < EMPRESAS_NOMES.length; i++) {
            const empId = `emp_${String(i + 1).padStart(3, "0")}`;
            const empData = {
                id: empId,
                codigo_empresa: `TRW-EMP-${ANO_ATUAL}/${String(i + 1).padStart(3, "0")}`,
                razao_social: `${EMPRESAS_NOMES[i]} LTDA`,
                nome_fantasia: EMPRESAS_NOMES[i],
                cnpj: `${75 + i}.123.456/0001-${10 + i}`,
                email_contato: `contato@${EMPRESAS_NOMES[i].toLowerCase().replace(/[^a-z]/g, "")}.com.br`,
                telefone: `(75) 3625-${1000 + i}`,
                cidade: "Feira de Santana",
                uf: "BA",
                ativo: true,
                criado_em: new Date().toISOString()
            };
            await setDoc(doc(db, "empresas", empId), empData);
            empresas.push(empData);
        }
        log(`   ✅ ${empresas.length} empresas`);

        /* --------------------------------------------------------------
         * 3. CURSOS (com apelido)
         * ------------------------------------------------------------ */
        log("📚 Populando /cursos (com apelido)...");
        const cursos = [];
        for (const item of CURSOS_BASE) {
            const cursoId = `curso_${item.codigo.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
            const cursoData = {
                id: cursoId,
                codigo: item.codigo,
                apelido: item.apelido,
                nome: item.nome,
                descricao: `Curso oficial ${item.nome} ministrado por especialistas com foco prático.`,
                carga_horaria: item.carga,
                investimento_base: item.preco,
                modalidade_padrao: "Presencial",
                ativo: true,
                criado_em: new Date().toISOString()
            };
            await setDoc(doc(db, "cursos", cursoId), cursoData);
            cursos.push(cursoData);
        }
        log(`   ✅ ${cursos.length} cursos`);

        /* --------------------------------------------------------------
         * 4. TURMAS
         * ------------------------------------------------------------ */
        log("🏫 Populando /turmas...");
        const turmas = [];
        for (let i = 0; i < 10; i++) {
            const cursoBase = cursos[i];
            const turmaId = `turma_${String(i + 1).padStart(3, "0")}`;
            const codigoTurma = `${cursoBase.codigo}-${ANO_ATUAL}/${String(i + 1).padStart(3, "0")}`;

            const turmaData = {
                id: turmaId,
                codigo_turma: codigoTurma,
                curso_id: cursoBase.id,
                curso_codigo: cursoBase.codigo,
                curso_apelido: cursoBase.apelido,
                curso_nome: cursoBase.nome,
                instrutor: INSTRUTORES[i % INSTRUTORES.length],
                dias_semana: (i % 2 === 0) ? "Terças e Quintas" : "Sábados (Integral)",
                horario: (i % 2 === 0) ? "19:00 - 22:00" : "08:00 - 17:00",
                modalidade: "Presencial",
                vagas_maximas: 20,
                vagas_ocupadas: 0,
                alunos_matriculados: [],
                status: "Ativo",
                criado_em: new Date().toISOString()
            };

            await setDoc(doc(db, "turmas", turmaId), turmaData);
            turmas.push(turmaData);

            // ✅ Cronograma de exemplo — 3 aulas por turma
            const instrutorTurma = turmaData.instrutor;
            const diasSugeridos = [];

            // Gera 3 datas: +7, +14, +21 dias a partir de hoje
            for (let d = 1; d <= 3; d++) {
                const dt = new Date();
                dt.setDate(dt.getDate() + d * 7);
                diasSugeridos.push(dt.toISOString().split("T")[0]);
            }

            // Define horários coerentes com o turno da turma
            const ehNoturno = (i % 2 === 0);
            const horaInicio = ehNoturno ? "19:00" : "08:00";
            const horaFim = ehNoturno ? "22:00" : "17:00";
            const sala = `Lab 0${(i % 3) + 1}`;

            for (let d = 0; d < diasSugeridos.length; d++) {
                const aulaId = `aula_${String(d + 1).padStart(2, "0")}`;
                await setDoc(doc(db, "turmas", turmaId, "cronograma", aulaId), {
                    id: aulaId,
                    numero: d + 1,
                    data: diasSugeridos[d],
                    hora_inicio: horaInicio,
                    hora_fim: horaFim,
                    professor: instrutorTurma,
                    instrutor: instrutorTurma,       // alias — o UI procura ambos
                    sala: sala,
                    conteudo: `Aula ${d + 1} — ${cursoBase.nome}`,
                    criado_em: new Date().toISOString()
                });
            }
        }
        log(`   ✅ ${turmas.length} turmas (+3 aulas de cronograma cada)`);

        /* --------------------------------------------------------------
         * 5. ALUNOS + MATRÍCULAS EM SUBCOLEÇÕES
         * ------------------------------------------------------------ */
        log("🎓 Populando /alunos e criando subcoleções /turmas/{id}/matriculas...");
        let totalMatriculas = 0;

        for (let i = 0; i < 30; i++) {
            const alunoId = `aluno_${String(i + 1).padStart(3, "0")}`;
            const codigoAluno = `TRW-ALU-${ANO_ATUAL}/${String(i + 1).padStart(4, "0")}`;
            const turmaSorteada = turmas[i % 10];
            const empresa = empresas[i % empresas.length];

            const objMatricula = {
                turma_id: turmaSorteada.id,
                codigo_turma: turmaSorteada.codigo_turma,
                curso_id: turmaSorteada.curso_id,
                curso_codigo: turmaSorteada.curso_codigo,
                curso_nome: turmaSorteada.curso_nome,
                data_matricula: new Date().toISOString(),
                status_financeiro: "Confirmado"
            };

            const alunoData = {
                id: alunoId,
                codigo_aluno: codigoAluno,
                nome: NOMES_ALUNOS[i],
                email: `${NOMES_ALUNOS[i].toLowerCase().replace(/[^a-z]/g, "")}@gmail.com`,
                cpf: `${100 + i}.456.789-${(i % 90) + 10}`,
                telefone: `(75) 99123-${4000 + i}`,
                empresa_id: empresa.id,
                empresa_nome: empresa.nome_fantasia,
                matriculas: [objMatricula],
                ativo: true,
                criado_em: new Date().toISOString()
            };

            await setDoc(doc(db, "alunos", alunoId), alunoData);

            // ✅ Subcoleção agora é /matriculas
            await setDoc(
                doc(db, "turmas", turmaSorteada.id, "matriculas", alunoId),
                {
                    aluno_id: alunoId,
                    aluno_nome: alunoData.nome,
                    aluno_email: alunoData.email,
                    data_matricula: alunoData.criado_em,
                    status: "Matriculado"
                }
            );
            totalMatriculas++;

            turmaSorteada.vagas_ocupadas = (turmaSorteada.vagas_ocupadas || 0) + 1;
            if (!Array.isArray(turmaSorteada.alunos_matriculados)) {
                turmaSorteada.alunos_matriculados = [];
            }
            turmaSorteada.alunos_matriculados.push({
                aluno_id: alunoId,
                data_matricula: alunoData.criado_em,
                status: "Matriculado"
            });
        }

        for (const t of turmas) {
            await setDoc(doc(db, "turmas", t.id), {
                vagas_ocupadas: t.vagas_ocupadas,
                alunos_matriculados: t.alunos_matriculados
            }, { merge: true });
        }
        log(`   ✅ 30 alunos + ${totalMatriculas} matrículas em subcoleções`);

        /* --------------------------------------------------------------
         * 6. LEADS ✅ AGORA EM /leads
         * ------------------------------------------------------------ */
        log("📥 Populando /leads...");
        for (let i = 0; i < 40; i++) {
            const leadId = `lead_${String(i + 1).padStart(3, "0")}`;
            const cursoInteresse = cursos[i % cursos.length];

            await setDoc(doc(db, "leads", leadId), {   // ✅ /leads
                id: leadId,
                nome: `Lead ${i + 1} - ${NOMES_ALUNOS[i % NOMES_ALUNOS.length]}`,
                email: `lead${i + 1}@email.com`,
                telefone: `(75) 98888-${2000 + i}`,
                curso_interesse_id: cursoInteresse.id,
                curso_interesse_nome: cursoInteresse.nome,
                status: STATUS_LEADS[i % STATUS_LEADS.length],
                origem: (i % 2 === 0) ? "Site / Formulário" : "WhatsApp Direct",
                criado_em: new Date().toISOString()
            });
        }
        log(`   ✅ 40 leads`);

        /* --------------------------------------------------------------
         * 7. FINANCEIRO
         * ------------------------------------------------------------ */
        log("💰 Populando /financeiro...");
        for (let i = 0; i < 25; i++) {
            const finId = `fin_${String(i + 1).padStart(3, "0")}`;
            const alunoAssoc = NOMES_ALUNOS[i];
            const cursoAssoc = cursos[i % cursos.length];

            await setDoc(doc(db, "financeiro", finId), {
                id: finId,
                descricao: `Matrícula: ${alunoAssoc} - ${cursoAssoc.codigo}`,
                aluno_nome: alunoAssoc,
                valor: cursoAssoc.investimento_base,
                forma_pagamento: (i % 3 === 0) ? "PIX" : (i % 3 === 1) ? "Cartão de Crédito" : "Boleto",
                status: "Confirmado",
                data_pagamento: `${ANO_ATUAL}-10-0${(i % 7) + 1}`,
                criado_em: new Date().toISOString()
            });
        }
        log(`   ✅ 25 lançamentos financeiros`);

        /* --------------------------------------------------------------
         * FIM
         * ------------------------------------------------------------ */
        log("");
        log("═══════════════════════════════════════════════");
        log("🎉 SEED COMPLETO EXECUTADO COM SUCESSO!");
        log("═══════════════════════════════════════════════");
        log(`   📊 Administradores: ${ADMINISTRADORES.length}`);
        log(`   📊 Empresas:        ${empresas.length}`);
        log(`   📊 Cursos:          ${cursos.length} (com apelido)`);
        log(`   📊 Turmas:          ${turmas.length}`);
        log(`   📊 Alunos:          30`);
        log(`   📊 Matrículas:      ${totalMatriculas} (em subcoleções)`);
        log(`   📊 Leads:           40`);
        log(`   📊 Financeiro:      25`);
        log("═══════════════════════════════════════════════");

        return {
            ok: true,
            contadores: {
                administradores: ADMINISTRADORES.length,
                empresas: empresas.length,
                cursos: cursos.length,
                turmas: turmas.length,
                alunos: 30,
                matriculas: totalMatriculas,
                leads: 40,
                financeiro: 25
            }
        };

    } catch (erro) {
        console.error("❌ Erro durante o seed:", erro);
        throw erro;
    }
}