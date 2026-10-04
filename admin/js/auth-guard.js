import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { collection, query, where, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function checkAuth(callbackOnSuccess) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    try {
      // 1. Procura na coleção "administradores" pelo e-mail do utilizador autenticado
      const q = query(collection(db, "administradores"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      let adminData = null;

      if (!querySnapshot.empty) {
        // Pega os dados do primeiro documento encontrado com este e-mail
        adminData = querySnapshot.docs[0].data();
      } else {
        // Fallback de segurança caso o e-mail não esteja na coleção
        const masterSnap = await getDoc(doc(db, "administradores", "admin-master"));
        if (masterSnap.exists()) {
          adminData = masterSnap.data();
        }
      }

      // 2. Valida se o administrador está ativo
      if (!adminData || !adminData.ativo) {
        await signOut(auth);
        window.location.replace("login.html");
        return;
      }

      // 3. Executa o callback passando o utilizador e os dados corretos
      if (typeof callbackOnSuccess === "function") {
        callbackOnSuccess(user, adminData);
      }
    } catch (error) {
      console.error("Erro na verificação de permissões:", error);
      window.location.replace("login.html");
    }
  });
}

export async function logout() {
  await signOut(auth);
  window.location.replace("login.html");
}

window.fazerL0gout = logout;