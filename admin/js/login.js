import { auth, db } from "./firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const form = document.getElementById("login-form");
const errorBox = document.getElementById("error-msg");
const btn = document.getElementById("btn-submit");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";
    btn.disabled = true;
    btn.textContent = "Verificando credenciais...";

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
      // 1. Autentica no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Valida se o UID existe na coleção de administradores e está ativo
      const adminRef = doc(db, "administradores", user.uid);
      let adminSnap = await getDoc(adminRef);

      // Fallback: se o doc estiver salvo com o ID 'admin-master' gerado no seed
      if (!adminSnap.exists()) {
        const legacyRef = doc(db, "administradores", "admin-master");
        adminSnap = await getDoc(legacyRef);
      }

      if (adminSnap.exists() && adminSnap.data().ativo === true) {
        window.location.href = "lead_e_triagem.html";
      } else {
        await auth.signOut();
        throw new Error("Este usuário não possui permissão de administrador ativa.");
      }
    } catch (err) {
      errorBox.textContent = err.message.replace("Firebase: ", "");
      errorBox.style.display = "block";
    } finally {
      btn.disabled = false;
      btn.textContent = "Entrar no Painel";
    }
  });
}