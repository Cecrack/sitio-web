import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore, collection, addDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';



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

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        const userInfo = document.querySelector(".user-info span");
        const profileIcon = document.getElementById("profile-icon");
        const loginBtn = document.getElementById("login-btn");
        const createUserBtn = document.getElementById("create-user-btn");
        const logoutBtn = document.getElementById("logout-btn");
    
        if (loginBtn && createUserBtn && logoutBtn) {
            if (user) {
                if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
                if (profileIcon) profileIcon.style.backgroundImage = "url('path_to_user_profile_picture')";
                loginBtn.classList.add("hidden");
                createUserBtn.classList.add("hidden");
                logoutBtn.classList.remove("hidden");
            } else {
                if (userInfo) userInfo.textContent = "Iniciar sesión";
                if (profileIcon) profileIcon.style.backgroundImage = "none";
                loginBtn.classList.remove("hidden");
                createUserBtn.classList.remove("hidden");
                logoutBtn.classList.add("hidden");
            }
        }
    });

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
                alert("La contraseña debe tener al menos 6 caracteres.");
                return;
            }
        
            if (password !== confirmPassword) {
                alert("Las contraseñas no coinciden.");
                return;
            }
        
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                alert("Cuenta creada exitosamente. Ahora puedes iniciar sesión.");
                closeModal("create-user-form");
            } catch (error) {
                alert(`Error al crear usuario: ${error.message}`);
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
                alert("Bienvenido nuevamente!");
                closeModal("login-form");
            } catch (error) {
                alert(`Error al iniciar sesión: ${error.message}`);
            }
        });
    }

    // Función para cerrar sesión
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            alert("Has cerrado sesión.");
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

async function registrarVaca(data) {
    try {
        const vacasCollection = collection(db, "vacas");
        const docRef = await addDoc(vacasCollection, data);
        alert(`Registro completado con éxito. ID de la vaca: ${data.rfid}`);
    } catch (error) {
        console.error("Error al registrar la vaca:", error);
        alert("Error al registrar la vaca. Por favor, intenta de nuevo.");
    }
}

// Función para registrar una vaca con un ID personalizado
async function registrarVacaConId(data) {
    try {
        const vacasCollection = "vacas"; // Nombre de la colección
        const vacaId = data.rfid.toString().padStart(3, '0'); // Formatear el ID (ejemplo: 001, 002)

        const vacaDocRef = doc(db, vacasCollection, vacaId); // Definir el documento con el ID formateado
        await setDoc(vacaDocRef, data);

        alert(`Registro completado con éxito. ID de la vaca: ${vacaId}`);
    } catch (error) {
        console.error("Error al registrar la vaca con ID personalizado:", error);
        alert("Error al registrar la vaca. Por favor, intenta de nuevo.");
    }
}


document.getElementById("submit-btn").addEventListener("click", async (e) => {
    e.preventDefault();

    // Obtén los valores del formulario
    const rfid = await getNextVacaId(); // Generar el próximo ID
    const formattedRfid = rfid.toString().padStart(3, '0'); // Formatear el ID (ejemplo: 001)
    const raza = document.getElementById("raza").value.trim();
    const sexo = document.getElementById("sexo").value;
    const peso = parseFloat(document.getElementById("peso").value);
    const fechaIngreso = document.getElementById("fecha-ingreso").value;
    const estadoSalud = document.getElementById("estado-salud").value;
    const ubicacion = document.getElementById("corral").value;

    // Validar los campos requeridos
    if (!raza || !sexo || !peso || !fechaIngreso || !estadoSalud || !ubicacion) {
        alert("Por favor, completa todos los campos requeridos.");
        return;
    }

    // Estructurar los datos
    const vacaData = {
        rfid: formattedRfid,
        raza,
        sexo,
        peso,
        fechaIngreso,
        estadoSalud,
        ubicacion,
    };

    // Registrar la vaca con el ID personalizado
    await registrarVacaConId(vacaData);

    // Restablecer el formulario
    document.getElementById("raza").value = "";
    document.getElementById("sexo").value = "";
    document.getElementById("peso").value = "";
    document.getElementById("fecha-ingreso").value = "";
    document.getElementById("estado-salud").value = "";
    document.getElementById("corral").value = "";
});



document.addEventListener("DOMContentLoaded", function () {
    // Referencias a elementos del DOM
    const rfidInput = document.getElementById("rfid");
    const modal = document.getElementById("modal-registrar");
    const overlay = document.getElementById("overlay"); // Overlay de fondo
    const closeBtn = document.querySelector(".modal-close");
    const submitBtn = document.getElementById("submit-btn");
    const steps = document.querySelectorAll(".step");
    const stepContents = document.querySelectorAll(".step-content");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");

    let currentStep = 0;

    // Función para restablecer el formulario
    function resetForm() {
        document.querySelectorAll(".form-input").forEach((field) => {
            if (field.type === "file") {
                field.value = ""; // Limpiar archivos seleccionados
            } else {
                field.value = ""; // Limpiar campos de texto, select y textarea
            }
        });

        // Restaurar el placeholder y permitir edición en RFID
        if (rfidInput) {
            rfidInput.placeholder = "Esperando lectura...";
            rfidInput.removeAttribute("readonly"); // Asegurar que sea editable
        }

        currentStep = 0; // Reiniciar el paso actual
        updateStep(); // Volver al primer paso
    }

    // Actualizar el estado de los pasos
    function updateStep() {
        steps.forEach((step, index) => {
            step.classList.toggle("active", index === currentStep);
        });
        stepContents.forEach((content, index) => {
            content.classList.toggle("active", index === currentStep);
        });

        prevBtn.disabled = currentStep === 0;
        nextBtn.classList.toggle("hidden", currentStep === steps.length - 1);
        nextBtn.disabled = currentStep === steps.length - 1; // Deshabilitar "Siguiente" en el último paso
        submitBtn.classList.toggle("hidden", currentStep !== steps.length - 1);
        submitBtn.disabled = currentStep !== steps.length - 1; // Habilitar solo en el último paso
    }

    // Confirmar cancelación al cerrar
    closeBtn.addEventListener("click", function () {
        const confirmCancel = confirm("¿Está seguro de que desea cancelar el registro?");
        if (confirmCancel) {
            resetForm(); // Restablecer formulario
            modal.classList.remove("active"); // Cerrar el modal
            overlay.classList.remove("active"); // Ocultar el overlay
        }
    });

    // Enviar el formulario
    submitBtn.addEventListener("click", function (e) {
        e.preventDefault(); // Evitar envío real
        alert("Registro completado con éxito.");
        resetForm(); // Restablecer formulario
        modal.classList.remove("active"); // Cerrar el modal
        overlay.classList.remove("active"); // Ocultar el overlay
    });

    // Ocultar placeholder dinámicamente mientras el usuario escribe
    if (rfidInput) {
        rfidInput.addEventListener("input", function () {
            if (rfidInput.value.trim()) {
                rfidInput.placeholder = ""; // Ocultar placeholder cuando hay texto
            } else {
                rfidInput.placeholder = "Esperando lectura..."; // Restaurar placeholder
            }
        });
    }

    // Eventos de los botones de navegación
    prevBtn.addEventListener("click", () => {
        if (currentStep > 0) currentStep--;
        updateStep();
    });

    nextBtn.addEventListener("click", () => {
        if (validateStep(currentStep)) {
            if (currentStep < steps.length - 1) currentStep++;
            updateStep();
        }
    });

    // Validar campos requeridos para cada paso
    function validateStep(step) {
        let isValid = true;
        const fieldsToValidate = [];

        switch (step) {
            case 0: // Paso 1: RFID Escaneado
                fieldsToValidate.push(rfidInput);
                break;
            case 1: // Paso 2: Datos Generales
                fieldsToValidate.push(
                    document.getElementById("raza"),
                    document.getElementById("sexo"),
                    document.getElementById("peso"),
                    document.getElementById("fecha-ingreso")
                );
                break;
            case 2: // Paso 3: Datos Sanitarios
                fieldsToValidate.push(document.getElementById("estado-salud"));
                break;
            case 3: // Paso 4: Reproducción
                fieldsToValidate.push(document.getElementById("estado-reproductivo"));
                break;
            case 4: // Paso 5: Ubicación
                fieldsToValidate.push(document.getElementById("corral"));
                break;
            case 5: // Paso 6: Subir Foto
                fieldsToValidate.push(document.getElementById("foto-animal"));
                break;
        }

        fieldsToValidate.forEach((field) => {
            if (!field || !field.value.trim()) {
                markFieldError(field);
                isValid = false;
            } else {
                clearFieldError(field);
            }
        });

        return isValid;
    }

    // Marcar campo con error
    function markFieldError(field) {
        if (field) field.classList.add("error");
    }

    // Remover error de un campo
    function clearFieldError(field) {
        if (field) field.classList.remove("error");
    }

    // Inicializar el formulario
    updateStep();
});


document.addEventListener("DOMContentLoaded", function () {
    const consultaForm = document.getElementById("consulta-form");
    const consultaResult = document.getElementById("consulta-result");
    const infoVacaModal = document.getElementById("modal-informacion-vaca");
    const infoVacaContainer = document.getElementById("info-vaca");

    // Evento para manejar la consulta
    consultaForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rfid = document.getElementById("consulta-rfid").value.trim();

        if (!rfid) {
            consultaResult.textContent = "Por favor, introduce un identificador válido.";
            return;
        }

        consultaResult.textContent = "Buscando...";

        try {
            // Supongamos que tienes una API o base de datos que devuelve datos por RFID
            const response = await fetch(`/api/ganado?rfid=${rfid}`); // Cambia según tu API
            const data = await response.json();

            if (data) {
                // Muestra los datos en el modal de información
                infoVacaContainer.innerHTML = `
                    <h4>Detalles del Registro</h4>
                    <p><strong>RFID:</strong> ${data.rfid}</p>
                    <p><strong>Raza:</strong> ${data.raza}</p>
                    <p><strong>Sexo:</strong> ${data.sexo}</p>
                    <p><strong>Peso:</strong> ${data.peso} kg</p>
                    <p><strong>Fecha de Ingreso:</strong> ${data.fechaIngreso}</p>
                    <p><strong>Estado de Salud:</strong> ${data.estadoSalud}</p>
                    <p><strong>Ubicación:</strong> ${data.ubicacion}</p>
                    <p><strong>Historial de Vacunación:</strong> ${data.historialVacunacion}</p>
                `;
                openModal("modal-informacion-vaca");
            } else {
                consultaResult.textContent = "No se encontró ningún registro con este identificador.";
            }
        } catch (error) {
            consultaResult.textContent = "Error al realizar la consulta.";
            console.error(error);
        }
    });
});

// Funciones para manejar modales
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById("overlay");
    if (modal) {
        modal.classList.add("active");
        if (overlay) overlay.classList.add("active");
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    const overlay = document.getElementById("overlay");
    if (modal) {
        modal.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const eliminarBtn = document.getElementById("btn-eliminar");
    const confirmYesBtn = document.getElementById("confirm-yes");
    const razonEliminacion = document.getElementById("razon-eliminacion");
    const comentarioContainer = document.getElementById("comentario-container");
    const comentario = document.getElementById("comentario");

    let currentRecordId = null; // ID del registro que se desea eliminar

    // Mostrar campo de comentario si se selecciona "Otro"
    razonEliminacion.addEventListener("change", function () {
        if (razonEliminacion.value === "otro") {
            comentarioContainer.style.display = "block";
        } else {
            comentarioContainer.style.display = "none";
            comentario.value = ""; // Limpiar el comentario
        }
    });

    // Abrir el modal de eliminación
    eliminarBtn.addEventListener("click", function () {
        currentRecordId = "12345ABCDE"; // Simula obtener el ID del registro seleccionado
        openModal("modal-eliminar");
    });

    // Confirmar eliminación con razón
    confirmYesBtn.addEventListener("click", async function () {
        const razon = razonEliminacion.value;
        const comentarioAdicional = comentario.value.trim();

        if (!razon) {
            alert("Por favor, selecciona una razón para la eliminación.");
            return;
        }

        try {
            // Registrar la eliminación (simulación)
            console.log("Eliminando registro con ID:", currentRecordId);
            console.log("Razón:", razon);
            if (comentarioAdicional) {
                console.log("Comentario adicional:", comentarioAdicional);
            }

            // Firebase Firestore (ejemplo):
            // const docRef = doc(db, "vacas", currentRecordId);
            // await deleteDoc(docRef);
            // Opcional: Mover el registro eliminado a una colección "eliminados"
            // await addDoc(collection(db, "eliminados"), { id: currentRecordId, razon, comentarioAdicional });

            alert("Registro eliminado con éxito.");
            closeModal("modal-eliminar");
            currentRecordId = null;

            // Actualiza la tabla visualmente (simulación)
            const row = document.querySelector(`[data-id="${currentRecordId}"]`);
            if (row) row.remove();
        } catch (error) {
            console.error("Error al eliminar el registro:", error);
            alert("Ocurrió un error al intentar eliminar el registro.");
        }
    });
});

async function getNextVacaId() {
    const counterDocRef = doc(db, "metadata", "counters");

    try {
        const counterDoc = await getDoc(counterDocRef);

        if (counterDoc.exists()) {
            const lastVacaId = counterDoc.data().lastVacaId || 0;
            await updateDoc(counterDocRef, { lastVacaId: increment(1) });
            return lastVacaId + 1;
        } else {
            // Si el documento no existe, crearlo con el valor inicial
            await setDoc(counterDocRef, { lastVacaId: 1 });
            return 1;
        }
    } catch (error) {
        console.error("Error al obtener o inicializar el ID de vaca:", error);
        throw error;
    }
}


document.getElementById("add-vaca-btn").addEventListener("click", async () => {
    try {
        const nextId = await getNextVacaId();
        document.getElementById("rfid").value = nextId; // Mostrar el ID en el campo RFID
        openModal("modal-registrar");
    } catch (error) {
        alert("Error al obtener el ID para la nueva vaca. Intenta nuevamente.");
    }
});
