

import { checkAuth } from "./auth-guard.js";

// O checkAuth executa esta função assim que valida que o admin está logado
checkAuth((user, adminData) => {
  // adminData contém os dados vindos lá da coleção "administradores" do Firestore
  
  const nameElement = document.querySelector('.user-name');
  const emailElement = document.querySelector('.user-email');

  if (nameElement) {
    // Exibe o nome que está no banco (ou o displayName do Auth, ou o email como fallback)
    nameElement.textContent = adminData.nome || user.displayName || 'Administrador';
  }
  
  if (emailElement) {
    emailElement.textContent = user.email;
  }
});

