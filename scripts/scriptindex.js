import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js";

// Tu configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBGlP6JI7CnJh-MXVrzNfuZlVDUnW51jHc",
  authDomain: "ganaderia-d357d.firebaseapp.com",
  projectId: "ganaderia-d357d",
  storageBucket: "ganaderia-d357d.firebasestorage.app",
  messagingSenderId: "490392434742",
  appId: "1:490392434742:web:69d99d8ae9787abfb80097",
  measurementId: "G-Q55L8JX9WX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

// Funciones para manejar modales
const openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("active");
        document.getElementById("overlay").classList.add("active");
    }
};

const closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove("active");
        if (document.querySelectorAll(".modal.active").length === 0) {
            document.getElementById("overlay").classList.remove("active");
        }
    }
};

const switchToCreate = () => {
    closeModal('login-form');
    openModal('create-user-form');
};

const switchToLogin = () => {
    closeModal('create-user-form');
    openModal('login-form');
};

document.addEventListener("DOMContentLoaded", () => {
    // Manejo del menú de perfil
    const profileIcon = document.getElementById("profile-icon");
    const profileMenu = document.getElementById("profile-menu");

    if (profileIcon) {
        profileIcon.addEventListener("click", () => {
            profileMenu.classList.toggle("active");
        });
    }

    // Asignación de eventos a los botones de los modales
    document.getElementById('login-btn').addEventListener('click', () => openModal('login-form'));
    document.getElementById('create-user-btn').addEventListener('click', () => openModal('create-user-form'));
    document.querySelector('#login-form .close-button').addEventListener('click', () => closeModal('login-form'));
    document.querySelector('#create-user-form .close-button').addEventListener('click', () => closeModal('create-user-form'));
    document.getElementById('switch-to-create').addEventListener('click', switchToCreate);
    document.getElementById('switch-to-login').addEventListener('click', switchToLogin);

    onAuthStateChanged(auth, async (user) => {
        const userInfo = document.querySelector(".user-info span");
        const loginBtn = document.getElementById("login-btn");
        const createUserBtn = document.getElementById("create-user-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const perfilbtn = document.getElementById("perfil-btn");
        const inventariobtn = document.getElementById("btn-inventario");
        const reportesbtn = document.getElementById("btn-reportes");
        const consultabtn = document.getElementById("btn-consulta");
        const Hmedicobtn = document.getElementById("btn-historialMedico");
        const salidabtn = document.getElementById("btn-Salidaa");
        const adminPanelBtn = document.getElementById("btn-panel");

        if (user) {
            const idTokenResult = await user.getIdTokenResult();
            const isAdmin = idTokenResult.claims.admin || false;

            if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
            loginBtn.classList.add("hidden");
            createUserBtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
            perfilbtn.classList.remove("hidden");
            inventariobtn.classList.remove("hidden");
            reportesbtn.classList.remove("hidden");
            consultabtn.classList.remove("hidden");
            Hmedicobtn.classList.remove("hidden");
            salidabtn.classList.remove("hidden");

            if (isAdmin) {
                if (adminPanelBtn) adminPanelBtn.classList.remove("hidden");
            }
        } else {
            if (userInfo) userInfo.textContent = "Iniciar sesión";
            loginBtn.classList.remove("hidden");
            createUserBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden"); 
            perfilbtn.classList.add("hidden");
        }
    });

    // El código que manejaba la selección de tipo de usuario ha sido eliminado porque ya no es necesario.

    const createUserForm = document.getElementById("create-user-form-form");
    if (createUserForm) {
        createUserForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("create-email").value;
            const password = document.getElementById("create-password").value;
            const confirmPassword = document.getElementById("create-confirm-password").value;
            const groupName = document.getElementById("group-name").value.trim();

            if (password.length < 6) {
                Swal.fire({ icon: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
                return;
            }
            if (password !== confirmPassword) {
                Swal.fire({ icon: 'error', text: 'Las contraseñas no coinciden.' });
                return;
            }
            // Se valida que el nombre del grupo no esté vacío.
            if (!groupName) {
                Swal.fire({ icon: "warning", title: "Campo requerido", text: "Por favor, ingresa un nombre para el grupo." });
                return;
            }

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Se guardan los datos del usuario asumiendo que siempre es de tipo 'grupo'.
                const userData = {
                    email: user.email,
                    groupName: groupName, // El rol se asignará posteriormente si se auto-promociona.
                    createdAt: new Date()
                };

                await setDoc(doc(db, "usuarios", user.uid), userData);

                Swal.fire({ icon: 'success', title: '¡Cuenta creada!', text: 'Cuenta de grupo creada exitosamente. Ahora puedes iniciar sesión.' })
                .then(() => closeModal("create-user-form"));
            } catch (error) {
                Swal.fire({ icon: 'error', title: 'Error', text: `Error al crear usuario: ${error.message}` });
            }
        });
    }

    const loginForm = document.getElementById("login-form-form");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-username").value;
            const password = document.getElementById("login-password").value;

            try {
                await signInWithEmailAndPassword(auth, email, password);
                Swal.fire({ icon: "success", title: "Bienvenido nuevamente", text: "Inicio de sesión exitoso." })
                .then(() => window.location.href = "screens/inventario.html");
            } catch (error) {
                Swal.fire({ icon: "error", title: "Error de inicio de sesión", text: `Ocurrió un error: ${error.message}` });
            }
        });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            try {
                await signOut(auth);
                Swal.fire({ icon: "success", title: "Sesión cerrada", text: "Has cerrado sesión exitosamente." })
                .then(() => location.reload());
            } catch (error) {
                Swal.fire({ icon: "error", title: "Error al cerrar sesión", text: `Ocurrió un error: ${error.message}` });
            }
        });
    }
});