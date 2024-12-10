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
    deleteDoc,
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
        /*
        Swal.fire({
            
            icon: "success",
            title: "Conexión exitosa",
            text: "Conectado al servidor MQTT",
            timer: 3000,
            showConfirmButton: false
            
        });
         */   
        // Suscribirse al tópico /topic/rfid
        client.subscribe("/topic/rfid", (err) => {
            if (!err) {
                /*
                Swal.fire({
                    icon: "info",
                    title: "Suscripción exitosa",
                    text: "Te has suscrito al tópico: /topic/rfid",
                    timer: 3000,
                    showConfirmButton: false
                });
                */
            } else {
                /*
                Swal.fire({
                    icon: "error",
                    title: "Error de suscripción",
                    text: `No se pudo suscribir al tópico: ${err.message}`,
                });
                */
            }
        });
    });


    
    // Manejo de errores de conexión
    client.on("error", (err) => {
        /*
        Swal.fire({
            icon: "error",
            title: "Error de conexión",
            text: `Error: ${err.message}`,
        });
        */
    });


document.addEventListener("DOMContentLoaded", () => {

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
            Swal.fire({
                icon: "warning",
                title: "Contraseña débil",
                text: "La contraseña debe tener al menos 6 caracteres.",
                confirmButtonText: "Aceptar"
            });
            return;
        }
    
        if (password !== confirmPassword) {
            Swal.fire({
                icon: "error",
                title: "Error de contraseña",
                text: "Las contraseñas no coinciden.",
                confirmButtonText: "Aceptar"
            });
            return;
        }
    
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            Swal.fire({
                icon: "success",
                title: "Cuenta creada",
                text: "Cuenta creada exitosamente. Ahora puedes iniciar sesión.",
                confirmButtonText: "Aceptar"
            });
            closeModal("create-user-form");
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Error al crear usuario",
                text: `Ocurrió un error: ${error.message}`,
                confirmButtonText: "Aceptar"
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
                closeModal("login-form");
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



    const activateCameraBtn = document.getElementById("activate-camera-btn");
    const cameraPreview = document.getElementById("camera-preview");
    const cameraStream = document.getElementById("camera-stream");
    const capturePhotoBtn = document.getElementById("capture-photo-btn");
    const photoPreviewContainer = document.getElementById("photo-preview-container");
    const photoPreview = document.getElementById("photo-preview");
    const fotoAnimalInput = document.getElementById("foto-animal");

    let stream = null; // Variable para mantener el stream de la cámara

    // Activa la cámara en PC
    activateCameraBtn.addEventListener("click", async (e) => {
        e.preventDefault(); // Previene el comportamiento predeterminado del botón
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
            cameraStream.srcObject = stream;
            cameraPreview.classList.remove("hidden");
            photoPreviewContainer.classList.add("hidden"); // Oculta la vista previa si ya existía
            console.log("Cámara activada");
        } catch (error) {
            console.error("Error al activar la cámara:", error);
            Swal.fire({
                icon: "error",
                title: "Error al activar la cámara",
                text: "No se pudo activar la cámara. Por favor, verifica los permisos y vuelve a intentarlo.",
                confirmButtonText: "Aceptar"
            });
        }
        
    });

    // Captura la foto en PC
    capturePhotoBtn.addEventListener("click", () => {
        if (!stream) {
            Swal.fire({
                icon: "warning",
                title: "Cámara no activada",
                text: "Por favor, activa la cámara antes de capturar la foto.",
                confirmButtonText: "Aceptar"
            });
            return;
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = cameraStream.videoWidth;
        canvas.height = cameraStream.videoHeight;

        const context = canvas.getContext("2d");
        context.drawImage(cameraStream, 0, 0, canvas.width, canvas.height);

        // Detiene la cámara
        stream.getTracks().forEach((track) => track.stop());
        stream = null; // Limpia el stream para evitar problemas

        // Convierte el canvas a Blob
        canvas.toBlob((blob) => {
            capturedPhotoBlob = blob; // Guarda la foto en la variable global
            console.log("Foto capturada y almacenada temporalmente:", blob);

            // Muestra la foto en la vista previa
            const photoDataURL = URL.createObjectURL(blob);
            photoPreview.src = photoDataURL;
            photoPreviewContainer.classList.remove("hidden");
            cameraPreview.classList.add("hidden");
        }, "image/png");
    });

    // Manejo de la cámara en móviles
    fotoAnimalInput.addEventListener("change", () => {
        const file = fotoAnimalInput.files[0];
        if (file) {
            capturedPhotoBlob = file; // Guarda el archivo en la variable global
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.src = e.target.result;
                photoPreviewContainer.classList.remove("hidden");
                console.log("Foto cargada desde móvil:", file.name);
            };
            reader.readAsDataURL(file);
        }
    });

    // Convierte base64 a File (utilidad opcional)
    function dataURLtoFile(dataurl, filename) {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, { type: mime });
    }

    // Exponer `capturedPhotoBlob` para su uso posterior en el registro
    window.getCapturedPhotoBlob = () => capturedPhotoBlob;






    // Agrega evento a todas las imágenes en la tabla
    document.querySelectorAll(".data-grid td img").forEach((img) => {
        img.addEventListener("click", () => {
            modalImage.src = img.src; // Establece la imagen en el modal
            imageModal.style.display = "flex"; // Muestra el modal
        });
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
                //fieldsToValidate.push(document.getElementById("foto-animal"));
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
        const idInterno = document.getElementById("id-interno").value.trim();
        const raza = document.getElementById("raza").value.trim();
        const sexo = document.getElementById("sexo").value;
        const peso = parseFloat(document.getElementById("peso").value);
        const fechaIngreso = document.getElementById("fecha-ingreso").value;
        const estadoSalud = document.getElementById("estado-salud").value;
        const historialVacunacion = document.getElementById("historial-vacunacion").value.trim();
        const fechaDesparasitacion = document.getElementById("fecha-desparasitacion").value;
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
    
        if (!rfid || !idInterno || !raza || !sexo || !peso || !fechaIngreso || !estadoSalud || !ubicacion) {
            Swal.fire({
                icon: "warning",
                title: "Campos obligatorios faltantes",
                text: "Por favor, completa todos los campos obligatorios antes de continuar.",
                confirmButtonText: "Aceptar"
            });
            return;
        }
        
    
        // Subir la foto si fue capturada
        let fotoURL = null;
        if (capturedPhotoBlob) {
            try {
                const storageRef = ref(storage, `vacas/${rfid}_${Date.now()}.png`);
                await uploadBytes(storageRef, capturedPhotoBlob); // Sube la foto como un Blob
                fotoURL = await getDownloadURL(storageRef);
                console.log(`Imagen subida con éxito: ${fotoURL}`);
            } catch (error) {
                console.error("Error al subir la imagen:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error al subir la imagen",
                    text: "Ocurrió un error al subir la imagen. Por favor, intenta nuevamente.",
                    confirmButtonText: "Aceptar"
                });
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
             // Referencia al documento del contador en Firestore
            const contadorRef = doc(db, "configuracion", "contadorVacas");
            const contadorSnapshot = await getDoc(contadorRef);

            let contadorActual = 0;

            // Verifica si el documento del contador existe
            if (contadorSnapshot.exists()) {
                contadorActual = contadorSnapshot.data().contador || 0;
            }

            // Genera el nuevo ID interno basado en el contador
            const nuevoIdInterno = `vaca-${(contadorActual + 1).toString().padStart(3, "0")}`;
            vacaData.idInterno = nuevoIdInterno;

            // Guarda los datos en Firestore usando el nuevo ID interno
            const docRef = doc(db, "vacas", nuevoIdInterno); // Usa el nuevo número interno como ID del documento
            await setDoc(docRef, vacaData);

            // Actualiza el contador en Firestore
            await setDoc(contadorRef, { contador: contadorActual + 1 });
            
            // Publica mensaje MQTT de confirmacion de registro
            const responseMessage = `RFID Registrado`;
            console.log(responseMessage);
            client.publish("/topic/datos", responseMessage);
    
            Swal.fire({
                icon: "success",
                title: "Registro completado",
                text: `Registro completado con éxito. ID del documento: ${idInterno}`,
                confirmButtonText: "Aceptar"
            });
            
            
            // Actualiza la tabla después del registro
            await cargarVacas();

            // Limpia el formulario y vuelve al paso inicial
            document.getElementById("register-form").reset();
            currentStep = 0;
            updateStep();
            closeModal("modal-registrar");
    
            // Limpia la foto capturada
            capturedPhotoBlob = null;
            photoPreview.style.display = "none";
            photoPreview.src = "";
        } catch (error) {
            console.error("Error al registrar datos:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "Ocurrió un error al registrar los datos. Por favor, intenta nuevamente.",
                confirmButtonText: "Aceptar"
            });
            
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

// Función para cargar datos de las vacas
async function cargarVacas() {
    const tableBody = document.querySelector("#vacas-table tbody");

    try {
        // Obtén los datos de la colección "vacas"
        const querySnapshot = await getDocs(collection(db, "vacas"));

        // Limpia la tabla antes de agregar nuevos datos
        tableBody.innerHTML = "";

        if (querySnapshot.empty) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7">No se encontraron datos de vacas.</td>
                </tr>
            `;
            return;
        }

        // Itera sobre los documentos de la colección
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();

            // Crear una fila en la tabla (compatible con tarjetas en móviles)
            const row = document.createElement("tr");
            // Dentro de cargarVacas o donde generes las filas de las vacas
            row.innerHTML = `
            <td data-label="Imagen">
                <img src="${vaca.fotoURL || 'https://via.placeholder.com/100'}" alt="Imagen de la vaca" style="cursor: pointer; width: 100px; height: auto;" onclick="window.openImageModal('${vaca.fotoURL || 'https://via.placeholder.com/100'}')">
            </td>
            <td data-label="RFID">${vaca.rfid || "N/A"}</td>
            <td data-label="Raza">${vaca.raza || "N/A"}</td>
            <td data-label="Sexo">${vaca.sexo || "N/A"}</td>
            <td data-label="Peso">${vaca.peso ? `${vaca.peso} kg` : "N/A"}</td>
            <td data-label="Estado de Salud">${vaca.estadoSalud || "N/A"}</td>
            <td data-label="Observaciones">${vaca.observaciones || "N/A"}</td>
        `;


            tableBody.appendChild(row);
        });

        console.log("Datos de las vacas cargados exitosamente.");
    } catch (error) {
        console.error("Error al cargar los datos de las vacas:", error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7">Error al cargar los datos.</td>
            </tr>
        `;
    }
}
// Función para abrir el modal de la imagen
window.openImageModal = function (imageUrl) {
    console.log("Abriendo modal de imagen con URL:", imageUrl);
    const modal = document.getElementById("image-modal");
    const modalImage = document.getElementById("modal-image");

    if (modal && modalImage) {
        modal.style.display = "block"; // Muestra el modal
        modalImage.src = imageUrl; // Establece la URL de la imagen
    } else {
        console.error("No se encontró el modal de imagen o el elemento de la imagen:", modal, modalImage);
    }
};

// Función para cerrar el modal de la imagen
window.closeImageModal = function () {
    const modal = document.getElementById("image-modal");
    if (modal) {
        modal.style.display = "none"; // Oculta el modal
    }
};

// Cierra el modal si se hace clic fuera del contenido
window.onclick = function (event) {
    const modal = document.getElementById("image-modal");
    if (event.target === modal) {
        window.closeImageModal();
    }
};




document.getElementById("nav-toggle").addEventListener("click", () => {
    const menu = document.getElementById("nav-menu");
    menu.classList.toggle("show");
});


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

        // Actualiza la tabla después del registro
        await cargarVacas();        

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

        // Volver al primer paso del modal
        const steps = document.querySelectorAll(".step");
        const stepContents = document.querySelectorAll(".step-content");

        steps.forEach((step, index) => {
            step.classList.toggle("active", index === 0); // Activa el primer paso
        });

        stepContents.forEach((content, index) => {
            content.classList.toggle("active", index === 0); // Muestra el contenido del primer paso
        });

        // Habilitar el botón "Siguiente" y deshabilitar el botón "Registrar"
        const nextBtn = document.getElementById("next-btn");
        const submitBtn = document.getElementById("submit-btn");
        if (nextBtn) {
            nextBtn.classList.remove("hidden");
            nextBtn.disabled = false;
        }
        if (submitBtn) {
            submitBtn.classList.add("hidden");
            submitBtn.disabled = true;
        }
    }

// Función para limpiar los campos del modal Consultar
function limpiarCamposConsultar() {
    console.log("Limpiando campos del modal Consultar...");
    const searchInput = document.getElementById("rfid-input");
    if (searchInput) searchInput.value = "";
}

let capturedPhotoBlob = null; // Variable para almacenar temporalmente la foto capturada

document.addEventListener("DOMContentLoaded", () => {
    
});