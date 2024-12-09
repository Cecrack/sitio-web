import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut 
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { 
    doc,
    getFirestore, 
    collection, 
    addDoc,
    setDoc,
    getDoc,
    query,
    where, 
    getDocs // Importa `getDocs` del paquete de Firestore
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';



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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

document.addEventListener("DOMContentLoaded", () => {

    // --- Código de MQTT Integrado ---

    // Configuración de MQTT
    const mqttUrl = "wss://d5e57d2e51ce444ea8dd953e6f0ef5a6.s1.eu.hivemq.cloud:8884/mqtt";
    const options = {
        username: "sergio",
        password: "Prueba123",
        protocol: "wss",
        reconnectPeriod: 1000
    };

    // Conexión al servidor MQTT
    const client = mqtt.connect(mqttUrl, options);

    // Manejo de conexión exitosa
    client.on("connect", () => {
        Swal.fire({
            icon: "success",
            title: "Conexión exitosa",
            text: "Conectado al servidor MQTT",
            timer: 3000,
            showConfirmButton: false
        });

        // Suscribirse al tópico /topic/rfid
        client.subscribe("/topic/rfid", (err) => {
            if (!err) {
                Swal.fire({
                    icon: "info",
                    title: "Suscripción exitosa",
                    text: "Te has suscrito al tópico: /topic/rfid",
                    timer: 3000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire({
                    icon: "error",
                    title: "Error de suscripción",
                    text: `No se pudo suscribir al tópico: ${err.message}`,
                });
            }
        });
    });

    
    // Manejo de errores de conexión
    client.on("error", (err) => {
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: `Error: ${err.message}`,
        });
    });

    async function getCurrentInternalId() {
        try {
            // Referencia al documento del contador en Firestore
            const contadorRef = doc(db, "configuracion", "contadorVacas");
            const contadorSnapshot = await getDoc(contadorRef);
    
            let contadorActual = 0;
    
            // Verifica si el documento del contador existe
            if (contadorSnapshot.exists()) {
                contadorActual = contadorSnapshot.data().contador || 0;
            }
    
            // Genera el número interno en el formato vaca-001 sin actualizar el contador
            const numeroInterno = `vaca-${(contadorActual + 1).toString().padStart(3, "0")}`;
            console.log(`Número interno generado temporalmente: ${numeroInterno}`);
            return { numeroInterno, contadorRef, contadorActual };
        } catch (error) {
            console.error("Error al obtener el siguiente número interno:", error);
            return { numeroInterno: null, contadorRef: null, contadorActual: null };
        }
    }

    // Manejo de mensajes recibidos en /topic/rfid
    client.on("message", async (topic, message) => {
        if (topic === "/topic/rfid") {
            const rfidValue = message.toString().trim();
            console.log("Mensaje recibido desde /topic/rfid:", rfidValue);

            // Inputs para registro y consulta
            const registerRfidInput = document.getElementById("rfid");
            const searchInput = document.getElementById("rfid-input");
            const internalIdInput = document.getElementById("id-interno");

            // Rellenar el input de registro si existe
            if (registerRfidInput) {
                console.log("Rellenando input de registro con:", rfidValue);
                registerRfidInput.value = rfidValue;
            }

            // Rellenar el input de consulta si existe
            if (searchInput) {
                console.log("Rellenando input de consulta con:", rfidValue);
                searchInput.value = rfidValue;
            }

            try {
                const vacasRef = collection(db, "vacas");
                const q = query(vacasRef, where("rfid", "==", rfidValue));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    // Si el RFID ya existe en la base de datos
                    const doc = querySnapshot.docs[0];
                    const vacaData = doc.data();
                    const vacaId = doc.id;

                    console.log("RFID encontrado. Datos de la vaca:", vacaData);

                    // Rellenar el número interno en el input correspondiente (si aplica)
                    if (internalIdInput) {
                        console.log("Rellenando input de número interno con:", vacaData.idInterno || "N/A");
                        internalIdInput.value = vacaData.idInterno || "N/A";
                    }

                    // Mensaje de confirmación
                    const responseMessage = `RFID Escaneado, ID: ${vacaId}`;
                    console.log(responseMessage);
                    client.publish("/topic/datos", responseMessage);
                } else {
                    // Si el RFID no existe en la base de datos
                    console.log("RFID no encontrado en la base de datos.");

                    // Generar número interno temporal para registro
                    const { numeroInterno } = await getCurrentInternalId();
                    if (numeroInterno && internalIdInput) {
                        console.log("Generando número interno temporal:", numeroInterno);
                        internalIdInput.value = numeroInterno;
                    }

                    // Mensaje para RFID no registrado
                    const responseMessage = `RFID Escaneado, No registrado`;
                    console.log(responseMessage);
                    client.publish("/topic/datos", responseMessage);
                }
            } catch (error) {
                console.error("Error al consultar Firestore:", error);
            }
        }
    });


    // Botón para enviar mensajes al tópico /topic/datos
    const sendButton = document.getElementById("sendMessage");
    const messageInput = document.getElementById("messageInput");
    if (sendButton && messageInput) {
        sendButton.addEventListener("click", () => {
            const message = messageInput.value.trim();
            if (message) {
                client.publish("/topic/datos", message, (err) => {
                    if (!err) {
                        Swal.fire({
                            icon: "success",
                            title: "Mensaje enviado",
                            text: `Mensaje: ${message} enviado al tópico: /topic/datos`,
                            timer: 3000,
                            showConfirmButton: false
                        });
                    } else {
                        Swal.fire({
                            icon: "error",
                            title: "Error al enviar mensaje",
                            text: `Error: ${err.message}`,
                        });
                    }
                });
            } else {
                Swal.fire({
                    icon: "warning",
                    title: "Campo vacío",
                    text: "Por favor, escribe un mensaje antes de enviarlo.",
                });
            }
        });
    }
    
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

document.querySelectorAll('.form-input').forEach(input => {
    input.removeAttribute('readonly');
    input.disabled = false;
});

document.getElementById("sexo").addEventListener("change", () => {
    const estadoReproductivo = document.getElementById("estado-reproductivo");
    const fechaUltimoParto = document.getElementById("fecha-ultimo-parto");
    const numeroCrias = document.getElementById("numero-crias");

    if (document.getElementById("sexo").value === "macho") {
        // Desactivar y ocultar campos
        estadoReproductivo.disabled = true;
        fechaUltimoParto.disabled = true;
        numeroCrias.disabled = true;

        estadoReproductivo.value = "N/A";
        fechaUltimoParto.value = "N/A";
        numeroCrias.value = "N/A";
    } else {
        // Activar campos
        estadoReproductivo.disabled = false;
        fechaUltimoParto.disabled = false;
        numeroCrias.disabled = false;

        estadoReproductivo.value = "";
        fechaUltimoParto.value = "";
        numeroCrias.value = "";
    }
});


document.addEventListener("DOMContentLoaded", () => {
    cargarVacas();

    const imageModal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");
    const closeImageModal = document.getElementById("close-image-modal");

    // Agrega evento a todas las imágenes en la tabla
    document.querySelectorAll(".data-grid td img").forEach((img) => {
        img.addEventListener("click", () => {
            modalImage.src = img.src; // Establece la imagen en el modal
            imageModal.style.display = "flex"; // Muestra el modal
        });
    });

    // Cierra el modal cuando se hace clic en el botón de cerrar
    closeImageModal.addEventListener("click", () => {
        imageModal.style.display = "none";
    });

    // Cierra el modal si se hace clic fuera de la imagen
    imageModal.addEventListener("click", (e) => {
        if (e.target === imageModal) {
            imageModal.style.display = "none";
        }
    });

    // Modificar la función `openModal` para incluir limpieza de campos
    window.openModal = (modalId) => {
        console.log("Abriendo modal:", modalId);
        if (modalId === "modal-registrar") {
            limpiarCamposRegistrar();
        } else if (modalId === "modal-consultar") {
            limpiarCamposConsultar();
        }

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
            document.getElementById("overlay").classList.add("active");
        } else {
            console.warn("Modal no encontrado:", modalId);
        }
    };

    const steps = document.querySelectorAll(".step");
    const stepContents = document.querySelectorAll(".step-content");
    const prevBtn = document.getElementById("prev-btn");
    const nextBtn = document.getElementById("next-btn");
    const submitBtn = document.getElementById("submit-btn");
    const formInputs = document.querySelectorAll(".form-input");

    let currentStep = 0;

    // Habilitar la edición en todos los campos del formulario
    formInputs.forEach((input) => {
        input.removeAttribute("readonly");
    });

    // Actualiza el estado de los pasos
    function updateStep() {
        const steps = document.querySelectorAll(".step");
        const stepContents = document.querySelectorAll(".step-content");
        const prevBtn = document.getElementById("prev-btn");
        const nextBtn = document.getElementById("next-btn");
        const submitBtn = document.getElementById("submit-btn");
    
        steps.forEach((step, index) => {
            step.classList.toggle("active", index === currentStep);
        });
        stepContents.forEach((content, index) => {
            content.classList.toggle("active", index === currentStep);

            // Oculta los mensajes de error de los pasos no activos
            const errorMessage = content.querySelector(".error-message");
            if (errorMessage) errorMessage.classList.add("hidden");
        });
    
        prevBtn.disabled = currentStep === 0;
        nextBtn.disabled = currentStep === steps.length - 1; // Desactivar "Siguiente" en el último paso
        nextBtn.classList.toggle("hidden", currentStep === steps.length - 1);
        submitBtn.classList.toggle("hidden", currentStep !== steps.length - 1);
    
        if (currentStep === steps.length - 1) {
            submitBtn.disabled = false;
        } else {
            submitBtn.disabled = true;
        }
    }
    

    // Validar campos requeridos para cada paso
    function validateStep(step) {
        let isValid = true;
        const fieldsToValidate = [];
    
        // Define los campos requeridos por paso
        switch (step) {
            case 0: // Paso 1: Identificación
                fieldsToValidate.push(document.getElementById("rfid"));
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
                fieldsToValidate.push(
                    document.getElementById("historial-vacunacion"),
                    document.getElementById("fecha-desparasitacion"),
                    document.getElementById("estado-salud")
                );
                break;
            case 3: // Paso 4: Reproducción
                const estadoReproductivo = document.getElementById("estado-reproductivo");
                const fechaUltimoParto = document.getElementById("fecha-ultimo-parto");
                const numeroCrias = document.getElementById("numero-crias");
    
                if (!estadoReproductivo.disabled) {
                    fieldsToValidate.push(estadoReproductivo);
                }
                if (!fechaUltimoParto.disabled) {
                    fieldsToValidate.push(fechaUltimoParto);
                }
                if (!numeroCrias.disabled) {
                    fieldsToValidate.push(numeroCrias);
                }
                break;
            case 4: // Paso 5: Ubicación
                fieldsToValidate.push(document.getElementById("corral"));
                break;
            case 5: // Paso 6: Foto del animal (opcional en este ejemplo)
                fieldsToValidate.push(document.getElementById("foto-animal"));
                break;
        }
    
        // Validar cada campo requerido
        fieldsToValidate.forEach((field) => {
            if (!field.value || field.value.trim() === "") {
                markFieldError(field);
                isValid = false;
            } else {
                clearFieldError(field);
            }
        });
    
        return isValid;
    }
    
    // Marca un campo como error y agrega eventos para corregirlo
    function markFieldError(field) {
        if (field) {
            field.classList.add("error");
            // Elimina el estado de error al escribir o enfocar
            field.addEventListener("input", () => clearFieldError(field));
            field.addEventListener("focus", () => clearFieldError(field));
        }
    }

    // Elimina el estado de error
    function clearFieldError(field) {
        if (field) {
            field.classList.remove("error");
        }
    }

    // Supongamos que quieres iterar sobre varios campos de formulario
    document.querySelectorAll(".form-input").forEach((field) => {
        field.addEventListener("input", () => {
            console.log(`Corrigiendo error en ${field.id}`);
            clearFieldError(field);
        });
    });

    const errorMessage = document.getElementById("error-message");

    nextBtn.addEventListener("click", () => {
        const currentErrorMessage = document.querySelector(`#error-message-${currentStep + 1}`);
    
        if (validateStep(currentStep)) {
            // Oculta el mensaje de error si todo está validado
            currentErrorMessage.classList.add("hidden");
            currentStep++;
            updateStep();
        } else {
            // Muestra el mensaje de error solo en el paso actual
            currentErrorMessage.textContent = "Por favor, completa todos los campos requeridos para avanzar.";
            currentErrorMessage.classList.remove("hidden");
        }
    });
    
    

    prevBtn.addEventListener("click", () => {
        const errorMessage = document.querySelector(`#error-message-${currentStep + 1}`);
        if (currentStep > 0) {
            if (errorMessage) {
                errorMessage.textContent = ""; // Limpia el mensaje de error
                errorMessage.classList.add("hidden"); // Oculta el mensaje
            }
            currentStep--;
            updateStep();
        }
    });
    

    async function getCurrentInternalId() {
        try {
            // Referencia al documento del contador en Firestore
            const contadorRef = doc(db, "configuracion", "contadorVacas");
            const contadorSnapshot = await getDoc(contadorRef);
    
            let contadorActual = 0;
    
            // Verifica si el documento del contador existe
            if (contadorSnapshot.exists()) {
                contadorActual = contadorSnapshot.data().contador || 0;
            }
    
            // Genera el número interno en el formato vaca-001 sin actualizar el contador
            const numeroInterno = `vaca-${(contadorActual + 1).toString().padStart(3, "0")}`;
            console.log(`Número interno generado temporalmente: ${numeroInterno}`);
            return { numeroInterno, contadorRef, contadorActual };
        } catch (error) {
            console.error("Error al obtener el siguiente número interno:", error);
            return { numeroInterno: null, contadorRef: null, contadorActual: null };
        }
    }

    // Función para registrar datos
    async function registrarDatos() {
        // Captura todos los campos del formulario
        const rfid = document.getElementById("rfid").value.trim();
        const idInterno = document.getElementById("id-interno").value.trim(); // Nuevo campo
        const raza = document.getElementById("raza").value.trim();
        const sexo = document.getElementById("sexo").value;
        const peso = parseFloat(document.getElementById("peso").value);
        const fechaIngreso = document.getElementById("fecha-ingreso").value;
        const estadoSalud = document.getElementById("estado-salud").value;
        const historialVacunacion = document.getElementById("historial-vacunacion").value.trim();
        const fechaDesparasitacion = document.getElementById("fecha-desparasitacion").value;
        // Verificar los campos relacionados con reproducción
        const estadoReproductivo = document.getElementById("estado-reproductivo").disabled
            ? "N/A"
            : document.getElementById("estado-reproductivo").value;
        const fechaUltimoParto = document.getElementById("fecha-ultimo-parto").disabled
            ? "N/A"
            : document.getElementById("fecha-ultimo-parto").value || "N/A";
        const numeroCrias = document.getElementById("numero-crias").disabled
            ? "N/A"
            : parseInt(document.getElementById("numero-crias").value) || 0;

        const ubicacion = document.getElementById("corral").value.trim();
        const observaciones = document.getElementById("observaciones").value.trim();
        const fotoAnimal = document.getElementById("foto-animal").files[0];

        if (!rfid || !idInterno || !raza || !sexo || !peso || !fechaIngreso || !estadoSalud || !ubicacion) {
            alert("Por favor completa todos los campos obligatorios.");
            return;
        }
    
        // Subir imagen a Firebase Storage
        let fotoURL = null;
        if (fotoAnimal) {
            try {
                const storage = getStorage();
                const storageRef = ref(storage, `vacas/${rfid}_${Date.now()}`);
                await uploadBytes(storageRef, fotoAnimal);
                fotoURL = await getDownloadURL(storageRef);
                console.log(`Imagen subida con éxito: ${fotoURL}`);
            } catch (error) {
                console.error("Error al subir la imagen:", error);
                alert("Ocurrió un error al subir la imagen. Por favor, intenta nuevamente.");
                return;
            }
        }
    
        // Estructura de datos para guardar en Firestore
        const vacaData = {
            rfid,
            idInterno,
            raza,
            sexo,
            peso,
            fechaIngreso,
            estadoSalud,
            historialVacunacion: historialVacunacion || "N/A",
            fechaDesparasitacion: fechaDesparasitacion || "N/A",
            estadoReproductivo,
            fechaUltimoParto,
            numeroCrias,
            ubicacion,
            observaciones: observaciones || "Sin observaciones",
            fotoURL: fotoURL || "Sin imagen",
        };
    
        try {
            // Guarda los datos en Firestore usando `setDoc` y un ID personalizado
            const docRef = doc(db, "vacas", idInterno); // Usa el número interno como ID del documento
            await setDoc(docRef, vacaData);
    
            // Actualiza el contador solo después de un registro exitoso
            const { contadorRef, contadorActual } = await getCurrentInternalId();
            await setDoc(contadorRef, { contador: contadorActual + 1 });
    
            alert(`Registro completado con éxito. ID del documento: ${idInterno}`);
    
            // Limpia el formulario y vuelve al paso inicial
            document.getElementById("register-form").reset();
            currentStep = 0;
            updateStep();
            closeModal("modal-registrar");
        } catch (error) {
            console.error("Error al registrar datos:", error);
            alert("Ocurrió un error al registrar los datos. Por favor, intenta nuevamente.");
        }
    }
    
    // Manejo del botón Registrar
    submitBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await registrarDatos();
    });

    // Inicializa los pasos
    updateStep();
});

// Función para cargar las vacas en el DataGridView
async function cargarVacas() {
    const vacasTableBody = document.querySelector(".data-grid tbody");
    const imageModal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");
    const closeImageModal = document.getElementById("close-image-modal");

    try {
        // Obtén todos los documentos de la colección "vacas"
        const querySnapshot = await getDocs(collection(db, "vacas"));

        // Limpia la tabla antes de llenarla
        vacasTableBody.innerHTML = "";

        // Itera sobre cada documento y agrega una fila a la tabla
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();

            // Crea una nueva fila
            const row = document.createElement("tr");

            // Si hay una URL para la foto, muestra la imagen, de lo contrario, un texto
            const fotoCell = document.createElement("td");
            if (vaca.fotoURL && vaca.fotoURL !== "Sin imagen") {
                const img = document.createElement("img");
                img.src = vaca.fotoURL;
                img.alt = "Foto de la vaca";
                img.style.width = "100px"; // Tamaño ajustado para hacerlas más visibles
                img.style.height = "100px";
                img.style.cursor = "pointer"; // Indicador visual de clic
                fotoCell.appendChild(img);

                // Añade evento para abrir el modal al hacer clic en la imagen
                img.addEventListener("click", () => {
                    modalImage.src = img.src; // Muestra la imagen en el modal
                    imageModal.style.display = "flex"; // Muestra el modal
                });
            } else {
                fotoCell.textContent = "Sin imagen";
            }

            // Agrega las demás celdas con la información de la vaca
            const rfidCell = document.createElement("td");
            rfidCell.textContent = vaca.rfid || "N/A";

            const razaCell = document.createElement("td");
            razaCell.textContent = vaca.raza || "N/A";

            const fechaIngresoCell = document.createElement("td");
            fechaIngresoCell.textContent = vaca.fechaIngreso || "N/A";

            const pesoCell = document.createElement("td");
            pesoCell.textContent = vaca.peso ? `${vaca.peso} kg` : "N/A";

            const estadoSaludCell = document.createElement("td");
            estadoSaludCell.textContent = vaca.estadoSalud || "N/A";

            const observacionesCell = document.createElement("td");
            observacionesCell.textContent = vaca.observaciones || "N/A";

            // Añade las celdas a la fila
            row.appendChild(fotoCell);
            row.appendChild(rfidCell);
            row.appendChild(razaCell);
            row.appendChild(fechaIngresoCell);
            row.appendChild(pesoCell);
            row.appendChild(estadoSaludCell);
            row.appendChild(observacionesCell);

            // Añade la fila al cuerpo de la tabla
            vacasTableBody.appendChild(row);
        });

        // Evento para cerrar el modal
        closeImageModal.addEventListener("click", () => {
            imageModal.style.display = "none";
        });

        // Cierra el modal si se hace clic fuera de la imagen
        imageModal.addEventListener("click", (e) => {
            if (e.target === imageModal) {
                imageModal.style.display = "none";
            }
        });

        console.log("Datos cargados correctamente.");
    } catch (error) {
        console.error("Error al cargar los datos:", error);
        alert("Hubo un error al cargar los datos. Por favor, intenta nuevamente.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const consultBtn = document.getElementById("consult-btn");
    const searchInput = document.getElementById("rfid-input");
    const vacaDetails = document.getElementById("vaca-details");
    const modalFullImage = document.getElementById("modal-full-image");

    // Función para buscar vaca por RFID o número interno
    async function buscarVacaPorRFIDoID(searchValue) {
        console.log("Iniciando búsqueda...");
        console.log("Valor ingresado para buscar:", searchValue);

        try {
            if (!searchValue || searchValue.trim() === "") {
                console.log("Campo vacío. Mostrando alerta.");
                Swal.fire({
                    icon: "warning",
                    title: "Campo vacío",
                    text: "Por favor, ingrese un RFID o un número interno válido.",
                });
                return;
            }

            const vacasRef = collection(db, "vacas");

            // Realizamos las dos consultas (por RFID y por ID Interno)
            console.log("Creando consultas...");
            const queryRFID = query(vacasRef, where("rfid", "==", searchValue.trim()));
            const queryIDInterno = query(vacasRef, where("idInterno", "==", searchValue.trim()));

            // Ejecutamos ambas consultas en paralelo
            console.log("Ejecutando consultas...");
            const [resultRFID, resultIDInterno] = await Promise.all([
                getDocs(queryRFID),
                getDocs(queryIDInterno),
            ]);

            console.log("Resultados de las consultas obtenidos.");
            console.log("Resultado RFID:", resultRFID.empty ? "Sin resultados" : resultRFID.docs);
            console.log("Resultado ID Interno:", resultIDInterno.empty ? "Sin resultados" : resultIDInterno.docs);

            // Verificamos si hay resultados en alguna de las consultas
            const querySnapshot = !resultRFID.empty ? resultRFID : resultIDInterno;

            if (querySnapshot.empty) {
                console.log("No se encontró ninguna vaca.");
                Swal.fire({
                    icon: "error",
                    title: "No encontrada",
                    text: "No se encontró ninguna vaca con el dato proporcionado.",
                });
                return;
            }

            console.log("Vaca encontrada. Procesando datos...");

            // Limpia el contenido del modal
            vacaDetails.innerHTML = "";

            // Procesa los datos de la vaca
            querySnapshot.forEach((doc) => {
                const vacaData = doc.data();
                console.log("Datos de la vaca:", vacaData);

                // Genera contenido dinámico para la tarjeta con icono de basura
                const vacaCard = `
                    <div class="vaca-header">
                        <img class="vaca-image" src="${vacaData.fotoURL || 'https://via.placeholder.com/150'}" alt="Foto de la vaca" onclick="openImage('${vacaData.fotoURL || ''}')">
                    </div>
                    <div class="vaca-info">
                        <p><strong>RFID:</strong> ${vacaData.rfid || 'N/A'}</p>
                        <p><strong>ID Interno:</strong> ${vacaData.idInterno || 'N/A'}</p>
                        <p><strong>Raza:</strong> ${vacaData.raza || 'N/A'}</p>
                        <p><strong>Sexo:</strong> ${vacaData.sexo || 'N/A'}</p>
                        <p><strong>Peso:</strong> ${vacaData.peso ? `${vacaData.peso} kg` : 'N/A'}</p>
                        <p><strong>Estado de Salud:</strong> ${vacaData.estadoSalud || 'N/A'}</p>
                        <p><strong>Historial Vacunación:</strong> ${vacaData.historialVacunacion || 'N/A'}</p>
                        <p><strong>Fecha Ingreso:</strong> ${vacaData.fechaIngreso || 'N/A'}</p>
                        <p><strong>Estado Reproductivo:</strong> ${vacaData.estadoReproductivo || 'N/A'}</p>
                        <p><strong>Ubicación:</strong> ${vacaData.ubicacion || 'N/A'}</p>
                        <p><strong>Observaciones:</strong> ${vacaData.observaciones || 'N/A'}</p>
                    </div>
                    <div class="vaca-actions">
                    <button class="delete-vaca-btn" onclick="confirmDelete('${doc.id}')">
                        <span class="material-icons">delete</span> Eliminar
                    </button>
                </div>

                `;
                vacaDetails.innerHTML = vacaCard;
            });

            console.log("Datos procesados. Abriendo modal.");
            // Abre el modal de datos
            openModal("modal-datos-vaca");
        } catch (error) {
            console.error("Error al buscar vaca:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Ocurrió un error al buscar la vaca. Inténtelo nuevamente.",
            });
        }
    }

     // Función para confirmar eliminación
     window.confirmDelete = (vacaId) => {
        console.log("Intentando eliminar vaca con ID:", vacaId);
        Swal.fire({
            title: "¿Estás seguro?",
            text: "Esta acción eliminará permanentemente todos los datos de esta vaca.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        }).then(async (result) => {
            if (result.isConfirmed) {
                console.log("Confirmado. Procediendo a eliminar vaca...");
                await deleteVaca(vacaId);
            }
        });
    };

    // Función para eliminar vaca por ID
    async function deleteVaca(vacaId) {
        try {
            await deleteDoc(doc(db, "vacas", vacaId));
            console.log("Vaca eliminada exitosamente.");
            Swal.fire({
                icon: "success",
                title: "Eliminada",
                text: "La vaca ha sido eliminada correctamente.",
            });
            closeModal("modal-datos-vaca");
        } catch (error) {
            console.error("Error al eliminar la vaca:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Ocurrió un error al eliminar la vaca. Inténtelo nuevamente.",
            });
        }
    }

    // Evento al hacer clic en el botón Consultar
    consultBtn.addEventListener("click", () => {
        const searchValue = searchInput.value.trim(); // Puede ser RFID o número interno
        console.log("Botón de consulta presionado. Valor ingresado:", searchValue);
        buscarVacaPorRFIDoID(searchValue);
    });

    // Función para abrir la imagen en el modal flotante
    window.openImage = (imageUrl) => {
        console.log("Intentando abrir imagen en modal:", imageUrl);
        if (imageUrl) {
            modalFullImage.src = imageUrl;
            openModal("modal-image");
        }
    };

    // Función para abrir un modal
    window.openModal = (modalId) => {
        console.log("Abriendo modal:", modalId);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
            document.getElementById("overlay").classList.add("active");
        } else {
            console.warn("Modal no encontrado:", modalId);
        }
    };

    window.closeModal = (modalId) => {
        console.log("Cerrando modal con ID:", modalId);
        if (modalId === "modal-registrar") {
            console.log("Limpiando modal de registro:", modalId);
            limpiarCamposRegistrar();
        } else if (modalId === "modal-consultar") {
            console.log("Limpiando modal de consulta:", modalId);
            limpiarCamposConsultar();
        } else {
            console.warn("Modal ID no reconocido:", modalId);
        }
    
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
            const overlay = document.getElementById("overlay");
            if (overlay) overlay.classList.remove("active");
        } else {
            console.warn("Modal no encontrado para cerrar:", modalId);
        }
    };
});

    // Función para limpiar los campos del modal Registrar
    function limpiarCamposRegistrar() {
        console.log("Limpiando campos del modal Registrar...");
        const registerRfidInput = document.getElementById("rfid");
        const internalIdInput = document.getElementById("id-interno");
        const razaInput = document.getElementById("raza");
        const sexoInput = document.getElementById("sexo");
        const pesoInput = document.getElementById("peso");
        const fechaIngresoInput = document.getElementById("fecha-ingreso");
        const estadoSaludInput = document.getElementById("estado-salud");
        const historialVacunacionInput = document.getElementById("historial-vacunacion");
        const fechaDesparasitacionInput = document.getElementById("fecha-desparasitacion");
        const estadoReproductivoInput = document.getElementById("estado-reproductivo");
        const fechaUltimoPartoInput = document.getElementById("fecha-ultimo-parto");
        const numeroCriasInput = document.getElementById("numero-crias");
        const ubicacionInput = document.getElementById("corral");
        const observacionesInput = document.getElementById("observaciones");
        const fotoAnimalInput = document.getElementById("foto-animal");

        if (registerRfidInput) registerRfidInput.value = "";
        if (internalIdInput) internalIdInput.value = "";
        if (razaInput) razaInput.value = "";
        if (sexoInput) sexoInput.value = "";
        if (pesoInput) pesoInput.value = "";
        if (fechaIngresoInput) fechaIngresoInput.value = "";
        if (estadoSaludInput) estadoSaludInput.value = "";
        if (historialVacunacionInput) historialVacunacionInput.value = "";
        if (fechaDesparasitacionInput) fechaDesparasitacionInput.value = "";
        if (estadoReproductivoInput) estadoReproductivoInput.value = "";
        if (fechaUltimoPartoInput) fechaUltimoPartoInput.value = "";
        if (numeroCriasInput) numeroCriasInput.value = "";
        if (ubicacionInput) ubicacionInput.value = "";
        if (observacionesInput) observacionesInput.value = "";
        if (fotoAnimalInput) fotoAnimalInput.value = null;
    }

// Función para limpiar los campos del modal Consultar
function limpiarCamposConsultar() {
    console.log("Limpiando campos del modal Consultar...");
    const searchInput = document.getElementById("rfid-input");
    if (searchInput) searchInput.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("camera-stream");
    const canvas = document.getElementById("photo-canvas");
    const photoPreview = document.getElementById("photo-preview");
    const takePhotoBtn = document.getElementById("take-photo-btn");

    // Solicita acceso a la cámara
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            console.log("Cámara activada");
        } catch (error) {
            console.error("Error al acceder a la cámara:", error);
            alert("No se pudo acceder a la cámara. Por favor, verifica los permisos.");
        }
    }

    // Captura la foto
    takePhotoBtn.addEventListener("click", (event) => {
        // Prevenir comportamiento predeterminado (por ejemplo, reiniciar la página)
        event.preventDefault();

        const context = canvas.getContext("2d");

        // Establece las dimensiones del canvas igual al video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Dibuja el fotograma actual del video en el canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convierte la imagen en base64
        const photoData = canvas.toDataURL("image/png");

        // Muestra la imagen en el elemento <img>
        photoPreview.src = photoData;
        photoPreview.style.display = "block";

        console.log("Foto tomada:", photoData);

        // Aquí puedes subir la foto a tu backend o almacenarla
        uploadPhoto(photoData);
    });

    // Función para subir la foto (opcional)
    async function uploadPhoto(photoData) {
        try {
            // Simulación de subida a un backend (ejemplo con Firebase Storage)
            const storageRef = ref(storage, `fotos/${Date.now()}.png`);
            const response = await fetch(photoData);
            const blob = await response.blob();
            await uploadBytes(storageRef, blob);
            const downloadURL = await getDownloadURL(storageRef);

            console.log("Foto subida exitosamente. URL:", downloadURL);
            alert("Foto subida correctamente.");
        } catch (error) {
            console.error("Error al subir la foto:", error);
            alert("No se pudo subir la foto. Intenta nuevamente.");
        }
    }

    // Inicia la cámara
    startCamera();
});

