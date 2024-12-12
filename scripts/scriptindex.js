import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore, collection, addDoc,getDocs,query, where } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';




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
// Inicializar Firestore
const db = getFirestore(app);
// Initialize Firebase Authentication
const auth = getAuth(app);
// Initialize Functions Authentication
const functions = getFunctions(app);
// Variable para saber si el estado de autenticación ha sido verificado
let isAuthChecked = false; 



document.addEventListener("DOMContentLoaded", () => {
     let isAuthChecked = false; // Variable para saber si el estado de autenticación ha sido verificado

    // Verifica el estado de autenticación
    onAuthStateChanged(auth, async (user) => {
        isAuthChecked = true;

        const userInfo = document.querySelector(".user-info span");
        const profileIcon = document.getElementById("profile-icon");
        const loginBtn = document.getElementById("login-btn");
        const createUserBtn = document.getElementById("create-user-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const perfilbtn = document.getElementById("perfil-btn");
        const adminList = document.getElementById("admin-list"); // Área de administradores
        const content = document.getElementById("content"); // Área de contenido principal btn-inicio
        const iniciobtn = document.getElementById("btn-inicio"); // Área de contenido principal btn-inicio
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
            iniciobtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
            perfilbtn.classList.remove("hidden");
            inventariobtn.classList.remove("hidden");
            reportesbtn.classList.remove("hidden");
            consultabtn.classList.remove("hidden");
            Hmedicobtn.classList.remove("hidden");
            adminPanelBtn.classList.remove("hidden");
            salidabtn.classList.remove("hidden");


            // Si el usuario es administrador
            if (isAdmin) {
                console.log("Usuario con rol de administrador detectado.");
                const adminPanelBtn = document.getElementById("btn-panel");
                if (adminPanelBtn) adminPanelBtn.classList.remove("hidden");

                // Llamar a getUsers solo cuando el usuario es administrador
                getUsers();
            } else {
                // Si no es administrador y está en el panel de administración
                if (window.location.pathname.includes('panelAdministracion.html')) {
                    if (content) {
                        content.innerHTML = `
                            <div class="no-permission">
                                <h2>No tienes permisos para acceder a esta sección.</h2>
                                <p>Por favor, contacta a un administrador para obtener más información.</p>
                            </div>
                        `;
                    }
                    console.log("Usuario no tiene permisos para acceder al panel.");
                }
            }
        } else {
            if (userInfo) userInfo.textContent = "Iniciar sesión";
            if (profileIcon) profileIcon.style.backgroundImage = "none";
            loginBtn.classList.remove("hidden");
            createUserBtn.classList.remove("hidden");
            logoutBtn.classList.add("hidden"); 
            perfilbtn.classList.add("hidden");

            if (window.location.pathname.includes('panelAdministracion.html')) {
                window.location.href = "../index.html";
            }
        }
    });
    

   const getUsers = async () => {
        const tableBody = document.querySelector("#users-table tbody");
    
        try {
            // Obtener el token del usuario actual
            const user = auth.currentUser; // Usamos la instancia de `auth` inicializada
            if (!user) {
                throw new Error("No hay un usuario autenticado.");
            }
            const userToken = await user.getIdToken();
    
            // Cambiar el URL por el de tu Firebase Cloud Function
            const response = await fetch("https://us-central1-ganaderia-d357d.cloudfunctions.net/getUsers", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${userToken}` // Incluimos el token de autenticación
                }
            });
    
            if (!response.ok) {
                throw new Error("Error al obtener usuarios: " + response.statusText);
            }
    
            const data = await response.json();
            const users = data.users;
    
            // Limpiar y llenar la tabla con los datos de los usuarios
            tableBody.innerHTML = "";
    
            users.forEach(user => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${user.email}</td>
                    <td>${user.uid}</td>
                    <td>${user.provider}</td>
                    <td>${new Date(user.creationTime).toLocaleDateString()}</td>
                    <td>${new Date(user.lastSignInTime).toLocaleDateString()}</td>
                `;
                tableBody.appendChild(row);
            });
        } catch (error) {
        }
    };

    // Configuración de títulos de página
    const pageTitles = {
        "index.html": "Inicio",
        "inventario.html": "Gestión de Inventario",
        "reportes.html": "Reportes",
        "consulta.html": "Consulta",
        "panelAdministracion.html": "Panel de Administración",
        "perfil.html": "Perfil de Usuario"
    };

    const currentPage = window.location.pathname.split("/").pop();
    const headerTitle = document.getElementById("page-title");
    if (headerTitle && pageTitles[currentPage]) {
        headerTitle.textContent = pageTitles[currentPage];
    }

    // Manejo de modales
    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
            document.getElementById("overlay").classList.add("active");
        }
    };

    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
            const activeModals = document.querySelectorAll(".modal.active");
            if (activeModals.length === 0) {
                document.getElementById("overlay").classList.remove("active");
            }
        }
    };
// Crear nuevo usuario
const createUserForm = document.getElementById("create-user-form");
if (createUserForm) {
    createUserForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("create-email").value;
        const password = document.getElementById("create-password").value;
        const confirmPassword = document.getElementById("create-confirm-password").value;

        if (password.length < 6) {
            Swal.fire({
                title: 'Error',
                text: 'La contraseña debe tener al menos 6 caracteres.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        if (password !== confirmPassword) {
            Swal.fire({
                title: 'Error',
                text: 'Las contraseñas no coinciden.',
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            Swal.fire({
                title: '¡Cuenta creada!',
                text: 'Cuenta creada exitosamente. Ahora puedes iniciar sesión.',
                icon: 'success',
                confirmButtonText: 'Aceptar'
            }).then(() => {
                closeModal("create-user-form"); // Cerrar el modal
            });
        } catch (error) {
            Swal.fire({
                title: 'Error',
                text: `Error al crear usuario: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'Aceptar'
            });
        }
    });
}


    // Manejo del perfil
    const profileIcon = document.getElementById("profile-icon");
    const profileMenu = document.getElementById("profile-menu");

    if (profileIcon) {
        profileIcon.addEventListener("click", () => {
            profileMenu.classList.toggle("active");
        });
    }

    // Función para mostrar el formulario de iniciar sesión
    window.switchToCreate = () => {
        document.getElementById("login-form").classList.remove("active");
        document.getElementById("create-user-form").classList.add("active");
    };

    window.switchToLogin = () => {
        document.getElementById("create-user-form").classList.remove("active");
        document.getElementById("login-form").classList.add("active");
    };

   // Función para iniciar sesión
const loginForm = document.getElementById("login-form");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("login-username").value;
        const password = document.getElementById("login-password").value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            Swal.fire({
                icon: "success",
                title: "Bienvenido nuevamente",
                text: "Inicio de sesión exitoso.",
                confirmButtonText: "Aceptar"
            });
            // Redirigir a la página de inventario
            window.location.href = "screens/inventario.html";
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error de inicio de sesión",
                text: `Ocurrió un error: ${error.message}`,
                confirmButtonText: "Aceptar"
            });
        }
    });
}

// Función para cerrar sesión
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            Swal.fire({
                icon: "success",
                title: "Sesión cerrada",
                text: "Has cerrado sesión exitosamente.",
                confirmButtonText: "Aceptar"
            }).then(() => {
                location.reload(); // Refrescar la página después de cerrar sesión
            });
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error al cerrar sesión",
                text: `Ocurrió un error: ${error.message}`,
                confirmButtonText: "Aceptar"
            });
        }
    });
}


       // Manejo del botón del Panel de Administración
const adminPanelBtn = document.getElementById("btn-panel");
if (adminPanelBtn) {
    adminPanelBtn.addEventListener("click", async () => {
        const currentPage = window.location.pathname.split("/").pop();
        if (isAuthChecked && auth.currentUser) {
            // Verificar si el usuario tiene el rol de administrador
            const user = auth.currentUser;
            const idTokenResult = await user.getIdTokenResult();
            const isAdmin = idTokenResult.claims.admin || false;

            if (isAdmin) {
                // Si es administrador, redirigir al panel de administración
                window.location.href = currentPage === 'index.html' ? 'screens/panelAdministracion.html' : '../screens/panelAdministracion.html';
            } else {
              
            }
        } else {
        
        }
    });
}

// Botón para ir al perfil
const perfilBtn = document.getElementById("perfil-btn");
if (perfilBtn) {
    perfilBtn.addEventListener("click", () => {
        window.location.href = "../screens/perfil.html"; // Redirige a perfil.html en la carpeta screens
    });
}

 });


  document.addEventListener("DOMContentLoaded", () => {
    // Firebase Authentication Logic (ya está bien definido en tu código)

    // Manejo del menú lateral en móviles
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show'); // Agregar o quitar la clase "show"
        });
    }
});



function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById("overlay");
    if (modal) {
        modal.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
    }
}
