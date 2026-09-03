// admin/auth-guard.js
import { auth, db } from "../firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export function checkAuth(callbackOnSuccess) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("login.html");
      return;
    }

    try {
      // Checa se o usuário é administrador ativo
      let adminSnap = await getDoc(doc(db, "administradores", user.uid));
      if (!adminSnap.exists()) {
        adminSnap = await getDoc(doc(db, "administradores", "admin-master"));
      }

      if (!adminSnap.exists() || !adminSnap.data().ativo) {
        await signOut(auth);
        window.location.replace("login.html");
        return;
      }

      // Executa o callback passando o usuário e os dados do admin
      if (typeof callbackOnSuccess === "function") {
        callbackOnSuccess(user, adminSnap.data());
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