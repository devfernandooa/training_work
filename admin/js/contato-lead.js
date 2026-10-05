import { db } from './firebase-config.js';
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Carregar os cursos da coleção "cursos" do Firestore para o <select id="curso">
async function carregarCursosNoSelect() {
    const selectCurso = document.getElementById("curso");

    if (!selectCurso) {
        console.warn("Aviso: Elemento <select id='curso'> não foi encontrado na página.");
        return;
    }

    try {
        console.log("A carregar cursos do Firestore...");
        const querySnapshot = await getDocs(collection(db, "cursos"));

        if (querySnapshot.empty) {
            console.warn("A coleção 'cursos' no Firestore está vazia.");
            return;
        }

        // Mantém a opção padrão inicial
        selectCurso.innerHTML = '<option value="">Selecione um curso...</option>';

        querySnapshot.forEach((docSnap) => {
            const curso = docSnap.data();
            console.log("Documento encontrado:", docSnap.id, curso); // Adicione isto para ver no F12

            const option = document.createElement("option");

            // Tente testar qual campo realmente existe no seu documento:
            const nomeCurso = curso.nome || curso.titulo || docSnap.id;

            option.value = nomeCurso;
            option.textContent = nomeCurso;
            selectCurso.appendChild(option);
        });

        console.log("Cursos carregados com sucesso no select!");
    } catch (error) {
        console.error("Erro critico ao carregar os cursos do Firestore:", error);
    }
}

// Executa ao carregar a página
document.addEventListener("DOMContentLoaded", carregarCursosNoSelect);

// 2. Manipular a submissão do formulário via JavaScript
const formularioContato = document.getElementById("formContato");

if (formularioContato) {
    formularioContato.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Botão de envio clicado, a processar formulário...");

        const nome = document.getElementById("nome").value;
        const telefone = document.getElementById("telefone").value;
        const email = document.getElementById("email").value;
        const cursoSelecionado = document.getElementById("curso").value;
        const mensagem = document.getElementById("mensagem").value;

        if (!cursoSelecionado) {
            alert("Por favor, selecione um curso de interesse.");
            return;
        }

        try {
            console.log("A tentar gravar na coleção 'inscricoes'...");

            // Certifique-se se a coleção no Firestore se chama exatamente "inscricoes" ou "leads"
            await addDoc(collection(db, "inscricoes"), {
                nome: nome,
                telefone: telefone,
                email: email,
                curso: cursoSelecionado,
                mensagem: mensagem,
                status: "novo", // Importante: usar "novo" para condizer com a regra do dashboard
                prioridade: "Média", // Opcional para preencher a prioridade padrão
                criado_em: new Date().toISOString() // Alinhado com o painel administrativo
            });
            console.log("Lead guardado com sucesso no Firestore!");

            // Substitua pelo número real do WhatsApp do administrador (com DDI e DDD)
            const numeroAdmin = "5575999999999";

            const textoWpp = `*Novo Lead / Inscrição - Training Work*%0A%0A*Nome:* ${nome}%0A*Telefone:* ${telefone}%0A*E-mail:* ${email}%0A*Curso:* ${cursoSelecionado}%0A*Mensagem:* ${mensagem}`;

            window.open(`https://wa.me/${numeroAdmin}?text=${textoWpp}`, "_blank");

            alert("Mensagem enviada e lead cadastrado com sucesso!");
            formularioContato.reset();

        } catch (error) {
            console.error("Erro crítico ao registar lead no Firestore:", error);
            alert("Ocorreu um erro ao enviar. Verifique o console (F12).");
        }
    });
} else {
    console.warn("Aviso: Elemento com ID 'formContato' não foi encontrado.");

}