import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
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
const functions = getFunctions(app, 'us-central1');

document.addEventListener("DOMContentLoaded", () => {
    // --- MANEJO DEL MENÚ DE NAVEGACIÓN ---
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    const overlay = document.querySelector('.overlay');

    if (navToggle && navMenu && overlay) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
            overlay.classList.toggle('show');
        });
        overlay.addEventListener('click', () => {
            navMenu.classList.remove('show');
            overlay.classList.remove('show');
        });
    }

    // --- ELEMENTOS DEL DOM ---
    const adminPanel = document.getElementById('admin-panel-content');
    const accessDenied = document.getElementById('access-denied');
    const addUserBtn = document.getElementById('add-user-btn');

    // --- FUNCIONES DE VISIBILIDAD ---
    const showAdminPanel = () => { if(adminPanel) adminPanel.classList.remove('hidden'); if(accessDenied) accessDenied.classList.add('hidden'); };
    const showAccessDenied = (message) => { 
        if(adminPanel) adminPanel.classList.add('hidden'); 
        if(accessDenied) accessDenied.classList.remove('hidden');
        if(accessDenied) accessDenied.querySelector('p').textContent = message;
    };

    // --- LÓGICA DE AUTENTICACIÓN Y PERMISOS ---
    onAuthStateChanged(auth, async (user) => {
        const userInfo = document.querySelector(".user-info span");
        const logoutBtn = document.getElementById("logout-btn");
        const perfilbtn = document.getElementById("perfil-btn");

        if (user) {
            if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
            if(logoutBtn) logoutBtn.classList.remove("hidden");
            if(perfilbtn) perfilbtn.classList.remove("hidden");

            await checkAdminAndPermissions(user);
        } else {
            if (userInfo) userInfo.textContent = "Iniciar sesión";
            if(logoutBtn) logoutBtn.classList.add("hidden");
            if(perfilbtn) perfilbtn.classList.add("hidden");
            showAccessDenied('Debes iniciar sesión para acceder a esta página.');
        }
    });

    // FUNCIÓN CLAVE: Comprueba si el usuario es admin o si puede convertirse en uno.
    window.checkAdminAndPermissions = async (currentUser) => {
        if (!currentUser) return;
        try {
            const idTokenResult = await currentUser.getIdTokenResult(true); // Forzar la actualización del token
            const userRole = idTokenResult.claims.role;

            if (userRole === 'administrador') {
                // Si ya es admin, muestra el panel y carga los usuarios
                showAdminPanel();
                const getUsersCallable = httpsCallable(functions, 'getUsers');
                const result = await getUsersCallable();
                renderUsersTable(result.data.users);
            } else {
                // Si no es admin, comprueba si su grupo tiene un admin
                const checkIfGroupHasAdmin = httpsCallable(functions, 'checkIfGroupHasAdmin');
                const result = await checkIfGroupHasAdmin();
                
                if (!result.data.hasAdmin) {
                    // Si no hay admin en el grupo, ofrecerle serlo
                    const confirmation = await Swal.fire({
                        title: 'Conviértete en Administrador',
                        text: "Tu grupo aún no tiene un administrador. ¿Deseas ser el administrador de tu grupo?",
                        icon: 'info',
                        showCancelButton: true,
                        confirmButtonText: 'Sí, quiero ser admin',
                        cancelButtonText: 'No, gracias'
                    });

                    if (confirmation.isConfirmed) {
                        // Si acepta, se le asigna el rol y se recarga la página
                        const setUserRole = httpsCallable(functions, 'setUserRole');
                        await setUserRole({ uid: currentUser.uid, role: 'administrador' });
                        await Swal.fire('¡Felicidades!', 'Ahora eres el administrador de tu grupo.', 'success');
                        window.location.reload(); // Recargar para aplicar los cambios
                    } else {
                        showAccessDenied("No tienes permisos de administrador.");
                    }
                } else {
                    showAccessDenied("No tienes permisos de administrador.");
                }
            }
        } catch (error) {
            console.error("Error checking admin permissions:", error);
            showAccessDenied(`Error al verificar permisos: ${error.message}`);
        }
    };
    
    // --- MANEJO DE EVENTOS ---
    if (addUserBtn) {
        addUserBtn.addEventListener('click', handleAddUser);
    }

    // El resto de funciones (handleAddUser, renderUsersTable, etc.) permanece igual
    async function handleAddUser() {
        const { value: formValues } = await Swal.fire({
            title: 'Crear Nuevo Usuario',
            html:
                '<input id="swal-email" class="swal2-input" placeholder="Email">' +
                '<input id="swal-password" type="password" class="swal2-input" placeholder="Contraseña">' +
                '<input id="swal-group" class="swal2-input" placeholder="Nombre del Grupo (Opcional)">'
            ,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Crear',
            cancelButtonText: 'Cancelar',
            preConfirm: () => {
                const email = document.getElementById('swal-email').value;
                const password = document.getElementById('swal-password').value;
                if (!email || !password) {
                    Swal.showValidationMessage(`Email y contraseña son obligatorios`);
                    return false;
                }
                if (password.length < 6) {
                    Swal.showValidationMessage(`La contraseña debe tener al menos 6 caracteres`);
                    return false;
                }
                return {
                    email: email,
                    password: password,
                    groupName: document.getElementById('swal-group').value.trim()
                };
            }
        });

        if (formValues) {
            try {
                const createUserCallable = httpsCallable(functions, 'createUser');
                const result = await createUserCallable(formValues);
                Swal.fire('Éxito', 'Usuario creado correctamente.', 'success');
                checkAdminAndPermissions(auth.currentUser);

            } catch (error) {
                console.error("Error al crear el usuario:", error);
                Swal.fire('Error', `No se pudo crear el usuario: ${error.message}`, 'error');
            }
        }
    }

    function renderUsersTable(users) {
        const tableBody = document.querySelector("#users-table tbody");
        if (!tableBody) return;
        tableBody.innerHTML = "";

        const currentUserUid = auth.currentUser.uid;

        users.forEach(user => {
            const claims = user.customClaims || {};
            const role = claims.role || 'operador';
            const group = claims.groupName || 'N/A';

            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Email">${user.email}</td>
                <td data-label="Proveedor">${user.provider || 'password'}</td>
                <td data-label="Creación">${new Date(user.metadata.creationTime).toLocaleDateString()}</td>
                <td data-label="Último Acceso">${new Date(user.metadata.lastSignInTime).toLocaleDateString()}</td>
                <td data-label="Grupo">${group}</td>
                <td data-label="Rol">
                    <select class="role-select" data-uid="${user.uid}" ${user.uid === currentUserUid ? 'disabled' : ''}>
                        <option value="administrador" ${role === 'administrador' ? 'selected' : ''}>Administrador</option>
                        <option value="encargado_mantenimiento" ${role === 'encargado_mantenimiento' ? 'selected' : ''}>Encargado Mantenimiento</option>
                        <option value="tecnico" ${role === 'tecnico' ? 'selected' : ''}>Técnico</option>
                        <option value="operador" ${role === 'operador' ? 'selected' : ''}>Operador</option>
                        <option value="ganadero" ${role === 'ganadero' ? 'selected' : ''}>Ganadero</option>
                    </select>
                </td>
                <td data-label="Acciones">
                    <button class="action-btn change-password-btn" data-uid="${user.uid}" data-email="${user.email}" title="Cambiar Contraseña"><i class="fas fa-key"></i></button>
                    <button class="action-btn delete-user-btn" data-uid="${user.uid}" data-email="${user.email}" ${user.uid === currentUserUid ? 'disabled' : ''} title="Eliminar Usuario"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    const tableBody = document.querySelector("#users-table tbody");
    if (tableBody) {
        tableBody.addEventListener('click', (e) => {
            const target = e.target.closest('.action-btn');
            if (!target) return;
            const uid = target.dataset.uid;
            const email = target.dataset.email;

            if (target.classList.contains('delete-user-btn')) handleDeleteUser(uid, email);
            if (target.classList.contains('change-password-btn')) handleUpdatePassword(uid, email);
        });

        tableBody.addEventListener('change', (e) => {
            const target = e.target;
            if (target.classList.contains('role-select')) {
                changeUserRole(target.dataset.uid, target.value);
            }
        });
    }

    async function handleDeleteUser(uid, email) {
        const result = await Swal.fire({ title: `¿Seguro de eliminar a ${email}?`, text: "Esta acción no se puede deshacer.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar' });
        if (result.isConfirmed) {
            try {
                const deleteUserCallable = httpsCallable(functions, 'deleteUser');
                await deleteUserCallable({ uid });
                Swal.fire('Eliminado', `El usuario ${email} ha sido eliminado.`, 'success').then(() => checkAdminAndPermissions(auth.currentUser));
            } catch (error) {
                Swal.fire('Error', `No se pudo eliminar: ${error.message}`, 'error');
            }
        }
    }

    async function handleUpdatePassword(uid, email) {
        const { value: newPassword } = await Swal.fire({ title: `Cambiar contraseña para ${email}`, input: 'password', inputLabel: 'Nueva contraseña', inputPlaceholder: 'Introduce la nueva contraseña', showCancelButton: true, confirmButtonText: 'Cambiar', inputValidator: (v) => !v || v.length < 6 ? 'La contraseña debe tener al menos 6 caracteres.' : null });
        if (newPassword) {
            try {
                const updateUserPasswordCallable = httpsCallable(functions, 'updateUserPassword');
                await updateUserPasswordCallable({ uid, newPassword });
                Swal.fire('Éxito', `La contraseña de ${email} ha sido cambiada.`, 'success');
            } catch (error) {
                Swal.fire('Error', `No se pudo cambiar la contraseña: ${error.message}`, 'error');
            }
        }
    }

    async function changeUserRole(uid, newRole) {
        try {
            const setUserRoleCallable = httpsCallable(functions, 'setUserRole');
            await setUserRoleCallable({ uid, role: newRole });
            Swal.fire('Rol actualizado', `El rol ha sido cambiado a ${newRole}.`, 'success');
        } catch (error) {
            Swal.fire('Error', `No se pudo cambiar el rol: ${error.message}`, 'error');
            checkAdminAndPermissions(auth.currentUser); 
        }
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => signOut(auth).then(() => window.location.href = "../index.html"));
    }
});