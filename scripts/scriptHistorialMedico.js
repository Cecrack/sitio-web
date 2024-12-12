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



document.addEventListener("DOMContentLoaded", async () => {
    const historialTableBody = document.querySelector("#history-table tbody");
    const rfidInput = document.getElementById("rfid-search");

    // Carga inicial de todos los historiales médicos
    await cargarTodosLosHistoriales();

    // Botón para agregar registro
    const addRecordBtn = document.getElementById("add-record-btn");
    addRecordBtn.addEventListener("click", () => {
        openModal("modal-add-record");
        document.getElementById("add-record-form").reset();
    });
});

document.getElementById("nav-toggle").addEventListener("click", () => {
    const menu = document.getElementById("nav-menu");
    menu.classList.toggle("show");
});


// Función para cargar un historial médico específico por RFID
async function cargarTodosLosHistoriales() {
    const tableBody = document.querySelector("#history-table tbody");
    console.log("Iniciando la función cargarTodosLosHistoriales...");

    try {
        console.log("Obteniendo la colección 'historialMedico' desde Firestore...");
        const querySnapshot = await getDocs(collection(db, "historialMedico"));
        console.log("Datos obtenidos desde Firestore:", querySnapshot);

        // Limpia la tabla antes de agregar los datos
        tableBody.innerHTML = "";
        console.log("Tabla limpiada.");

        if (querySnapshot.empty) {
            console.warn("No se encontraron historiales médicos en la base de datos.");
            tableBody.innerHTML = `<tr><td colspan="6">No hay historiales registrados.</td></tr>`;
            return;
        }

        console.log("Recorriendo los documentos de la colección...");
        for (const doc of querySnapshot.docs) {
            const historial = doc.data();
            console.log(`Procesando historial con ID: ${doc.id}`, historial);

            // Buscar información adicional de la vaca en la colección `vacas`
            let vacaInfo = { idInterno: "N/A", rfid: "N/A" };
            const rfidQuery = query(collection(db, "vacas"), where("rfid", "==", historial.rfid));
            const idInternoQuery = query(collection(db, "vacas"), where("idInterno", "==", historial.rfid));

            const [rfidSnapshot, idInternoSnapshot] = await Promise.all([
                getDocs(rfidQuery),
                getDocs(idInternoQuery),
            ]);

            if (!rfidSnapshot.empty) {
                vacaInfo = rfidSnapshot.docs[0].data();
            } else if (!idInternoSnapshot.empty) {
                vacaInfo = idInternoSnapshot.docs[0].data();
            }

            // Crear fila con los datos de la vaca y el historial
            const row = crearFilaHistorial(historial, doc.id, vacaInfo);
            console.log(`Fila creada para el historial con ID: ${doc.id}`, row);

            tableBody.appendChild(row);
            console.log(`Fila añadida a la tabla para el historial con ID: ${doc.id}`);
        }

        console.log("Todos los historiales médicos han sido cargados exitosamente.");
    } catch (error) {
        console.error("Error al cargar los historiales médicos:", error);
        tableBody.innerHTML = `<tr><td colspan="6">No se pudieron cargar los historiales.</td></tr>`;
    }
}

function crearFilaHistorial(historial, id, vacaInfo) {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td data-label="RFID / Identificador">
            <strong>ID Interno:</strong> ${vacaInfo.idInterno || "N/A"}<br>
            <strong>RFID:</strong> ${vacaInfo.rfid || historial.rfid || "N/A"}
        </td>
        <td data-label="Fecha">${historial.fecha || "N/A"}</td>
        <td data-label="Evento">${historial.evento || "N/A"}</td>
        <td data-label="Descripción">${historial.descripcion || "N/A"}</td>
        <td data-label="Veterinario">${historial.veterinario || "N/A"}</td>
        <td data-label="Acciones">
            <div class="actions-container">
                <span class="action-icon edit-icon" title="Editar" onclick="editarRegistro('${id}')">
                    <i class="material-icons">edit</i>
                </span>
                <span class="action-icon delete-icon" title="Eliminar" onclick="eliminarRegistro('${id}')">
                    <i class="material-icons">delete</i>
                </span>
            </div>
        </td>
    `;
    return row;
}



// Función para editar un historial médico
function editarHistorial(id) {
    // Abrir modal con datos del historial para editar
    console.log(`Editar historial con ID: ${id}`);
}

// Función para eliminar un historial médico
async function eliminarHistorial(id) {
    try {
        await deleteDoc(doc(db, "historialMedico", id));
        Swal.fire({
            icon: "success",
            title: "Eliminado",
            text: "El historial médico ha sido eliminado correctamente.",
        });
        cargarTodosLosHistoriales(); // Recarga la tabla
    } catch (error) {
        console.error("Error al eliminar el historial médico:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "Ocurrió un error al eliminar el historial médico.",
        });
    }
}


// --- Código de MQTT Integrado ---

    // Configuración de MQTT
    const mqttUrl = "wss://d5e57d2e51ce444ea8dd953e6f0ef5a6.s1.eu.hivemq.cloud:8884/mqtt";
    const options = {
        username: "sergio",
        password: "Prueba123",
        protocol: "wss",
        reconnectPeriod: 1000
    };

    const client = mqtt.connect(mqttUrl, options);

    client.on("connect", () => {
        console.log("Conexión MQTT exitosa.");
        client.subscribe("/topic/rfid", (err) => {
            if (!err) {
                console.log("Suscripción exitosa al tópico /topic/rfid");
            } else {
                console.error("Error al suscribirse al tópico:", err);
            }
        });
    });

    client.on("message", (topic, message) => {
        if (topic === "/topic/rfid") {
            const rfidValue = message.toString().trim(); // Obtener el valor recibido
            console.log("RFID recibido:", rfidValue);

            function filtrarRegistros() {
                const rfidValue = document.getElementById("filter-rfid").value.toLowerCase().trim();
                const dateValue = document.getElementById("filter-date").value;
                const eventValue = document.getElementById("filter-event").value.toLowerCase().trim();
                const descriptionValue = document.getElementById("filter-description").value.toLowerCase().trim();
                const veterinarianValue = document.getElementById("filter-veterinarian").value.toLowerCase().trim();
            
                const rows = document.querySelectorAll("#history-table tbody tr");
            
                rows.forEach((row) => {
                    const rfidCell = row.querySelector("td:nth-child(1)").textContent.toLowerCase();
                    const dateCell = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
                    const eventCell = row.querySelector("td:nth-child(3)").textContent.toLowerCase();
                    const descriptionCell = row.querySelector("td:nth-child(4)").textContent.toLowerCase();
                    const veterinarianCell = row.querySelector("td:nth-child(5)").textContent.toLowerCase();
            
                    const matchesRfid = rfidValue === "" || rfidCell.includes(rfidValue);
                    const matchesDate = dateValue === "" || dateCell.includes(dateValue);
                    const matchesEvent = eventValue === "" || eventCell.includes(eventValue);
                    const matchesDescription = descriptionValue === "" || descriptionCell.includes(descriptionValue);
                    const matchesVeterinarian = veterinarianValue === "" || veterinarianCell.includes(veterinarianValue);
            
                    if (matchesRfid && matchesDate && matchesEvent && matchesDescription && matchesVeterinarian) {
                        row.style.display = ""; // Mostrar la fila si coincide
                    } else {
                        row.style.display = "none"; // Ocultar la fila si no coincide
                    }
                });
            }
            
            // Escribir el RFID en el formulario de agregar registro
            const animalIdInput = document.getElementById("animal-id");
            if (animalIdInput && !animalIdInput.value) {
                animalIdInput.value = rfidValue;
            }
            
            // Escribir el RFID en el campo de filtro
            const rfidFilterInput = document.getElementById("filter-rfid");
            if (rfidFilterInput) {
                rfidFilterInput.value = rfidValue;
                filtrarRegistros(); // Ejecuta la función de filtrado
            }

            
        }
    });

    
    document.getElementById("add-record-form").addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const animalId = document.getElementById("animal-id").value.trim(); // RFID o Identificador Interno
        const fecha = document.getElementById("event-date").value;
        const evento = document.getElementById("event-type").value;
        const descripcion = document.getElementById("description").value.trim();
        const veterinario = document.getElementById("veterinarian").value.trim();
    
        if (!animalId || !fecha || !evento || !descripcion || !veterinario) {
            Swal.fire({
                icon: "warning",
                title: "Campos incompletos",
                text: "Por favor, completa todos los campos para registrar el historial médico.",
            });
            return;
        }
    
        try {
            // Validar si el RFID o idInterno existe en la colección `vacas`
            const rfidQuery = query(collection(db, "vacas"), where("rfid", "==", animalId));
            const idInternoQuery = query(collection(db, "vacas"), where("idInterno", "==", animalId));
            
            const [rfidSnapshot, idInternoSnapshot] = await Promise.all([
                getDocs(rfidQuery),
                getDocs(idInternoQuery),
            ]);
            
            if (rfidSnapshot.empty && idInternoSnapshot.empty) {
                Swal.fire({
                    icon: "error",
                    title: "Vaca no encontrada",
                    text: `No existe una vaca con el RFID o identificador interno: ${animalId}`,
                });
                return;
            }
            
    
            // Si existe, agregar el historial médico
            await addDoc(collection(db, "historialMedico"), {
                rfid: animalId,
                fecha,
                evento,
                descripcion,
                veterinario,
            });
    
            Swal.fire({
                icon: "success",
                title: "Registro agregado",
                text: "El registro médico fue agregado correctamente.",
            });
            closeModal("modal-add-record");
            cargarTodosLosHistoriales(animalId); // Recargar historial de la vaca
        } catch (error) {
            console.error("Error al agregar el registro:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo agregar el registro médico.",
            });
        }
    });
    
    
    
    
    async function agregarRegistroHistorial(rfid, fecha, evento, descripcion, veterinario) {
        try {
            await addDoc(collection(db, "historialMedico"), {
                rfid: rfid.trim(),
                fecha: fecha || new Date().toISOString(),
                evento: evento.trim(),
                descripcion: descripcion.trim(),
                veterinario: veterinario.trim()
            });
            console.log("Registro agregado exitosamente.");
        } catch (error) {
            console.error("Error al agregar el registro:", error);
        }
    }

    function openModal(modalId) {
        console.log(`Abriendo modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");
            document.getElementById("overlay").classList.add("active");
        } else {
            console.error(`No se encontró un modal con el ID: ${modalId}`);
        }
    }
    
    window.closeModal = function(modalId) {
        console.log(`Cerrando modal: ${modalId}`);
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");
            const overlay = document.getElementById("overlay");
            if (overlay) overlay.classList.remove("active");
        } else {
            console.error(`No se encontró un modal con el ID: ${modalId}`);
        }
    };
    
    document.addEventListener("DOMContentLoaded", () => {
        const tableBody = document.querySelector("#history-table tbody");
    
        // Filtros
        const filterRfid = document.getElementById("filter-rfid");
        const filterDate = document.getElementById("filter-date");
        const filterEvent = document.getElementById("filter-event");
        const filterDescription = document.getElementById("filter-description");
        const filterVeterinarian = document.getElementById("filter-veterinarian");
    
        // Cargar todos los historiales al inicio
        //cargarTodosLosHistoriales();
    
        // Añadir eventos de filtrado
        [filterRfid, filterDate, filterEvent, filterDescription, filterVeterinarian].forEach(filter => {
            filter.addEventListener("input", filtrarRegistros);
        });
        

// Definir eliminarRegistro en el ámbito global
window.eliminarRegistro = async function(id) {
    console.log(`Eliminar registro con ID: ${id}`);
    // Implementar lógica para eliminar
    try {
        await deleteDoc(doc(db, "historialMedico", id));
        Swal.fire("Eliminado", "El registro médico fue eliminado correctamente.", "success");
        cargarTodosLosHistoriales(); // Recargar la tabla
    } catch (error) {
        console.error("Error al eliminar el registro:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo eliminar el registro.",
        });
    }
};

window.toggleFilters = function() {
    const filtersContainer = document.getElementById("filters-container");
    if (filtersContainer) {
        filtersContainer.classList.toggle("active");
    } else {
        console.error("No se encontró el contenedor de filtros con el ID 'filters-container'.");
    }
};

// Mostrar/ocultar filtros en móviles
function toggleFilters() {
    const filtersContainer = document.getElementById("filters-container");
    filtersContainer.classList.toggle("active");
}

function filtrarRegistros() {
    const rfidValue = document.getElementById("filter-rfid").value.toLowerCase().trim();
    const dateValue = document.getElementById("filter-date").value;
    const eventValue = document.getElementById("filter-event").value.toLowerCase().trim();
    const descriptionValue = document.getElementById("filter-description").value.toLowerCase().trim();
    const veterinarianValue = document.getElementById("filter-veterinarian").value.toLowerCase().trim();

    const rows = document.querySelectorAll("#history-table tbody tr");

    rows.forEach((row) => {
        const rfidCell = row.querySelector("td:nth-child(1)").textContent.toLowerCase();
        const dateCell = row.querySelector("td:nth-child(2)").textContent.toLowerCase();
        const eventCell = row.querySelector("td:nth-child(3)").textContent.toLowerCase();
        const descriptionCell = row.querySelector("td:nth-child(4)").textContent.toLowerCase();
        const veterinarianCell = row.querySelector("td:nth-child(5)").textContent.toLowerCase();

        const matchesRfid = rfidValue === "" || rfidCell.includes(rfidValue);
        const matchesDate = dateValue === "" || dateCell.includes(dateValue);
        const matchesEvent = eventValue === "" || eventCell.includes(eventValue);
        const matchesDescription = descriptionValue === "" || descriptionCell.includes(descriptionValue);
        const matchesVeterinarian = veterinarianValue === "" || veterinarianCell.includes(veterinarianValue);

        if (matchesRfid && matchesDate && matchesEvent && matchesDescription && matchesVeterinarian) {
            row.style.display = ""; // Mostrar la fila si coincide
        } else {
            row.style.display = "none"; // Ocultar la fila si no coincide
        }
    });
}


// Escuchar cambios en los filtros
document.querySelectorAll(".filter-input").forEach(filter => {
    filter.addEventListener("input", filtrarRegistros);
});
});

window.editarRegistro = async function(id) {
    console.log(`Editar registro con ID: ${id}`);

    try {
        // Obtener el documento del registro desde Firestore
        const registroRef = doc(db, "historialMedico", id);
        const registroSnapshot = await getDoc(registroRef);

        if (registroSnapshot.exists()) {
            const registro = registroSnapshot.data();
            console.log("Datos actuales del registro:", registro);

            // Prellenar los campos del formulario del modal de edición
            document.getElementById("edit-animal-id").value = registro.rfid || ""; // RFID o identificador interno
            document.getElementById("edit-event-date").value = registro.fecha || "";
            document.getElementById("edit-event-type").value = registro.evento || "";
            document.getElementById("edit-description").value = registro.descripcion || "";
            document.getElementById("edit-veterinarian").value = registro.veterinario || "";

            // Abrir el modal de edición
            openModal("modal-edit-record");

            // Cambiar la funcionalidad del botón de guardar en el formulario de edición
            const editRecordForm = document.getElementById("edit-record-form");
            editRecordForm.onsubmit = async (e) => {
                e.preventDefault();

                // Obtener los valores actualizados
                const updatedFecha = document.getElementById("edit-event-date").value;
                const updatedEvento = document.getElementById("edit-event-type").value;
                const updatedDescripcion = document.getElementById("edit-description").value.trim();
                const updatedVeterinario = document.getElementById("edit-veterinarian").value.trim();

                if (!updatedFecha || !updatedEvento || !updatedDescripcion || !updatedVeterinario) {
                    Swal.fire({
                        icon: "warning",
                        title: "Campos incompletos",
                        text: "Por favor, completa todos los campos para actualizar el registro.",
                    });
                    return;
                }

                try {
                    // Actualizar el registro en Firestore
                    await setDoc(registroRef, {
                        rfid: registro.rfid, // El RFID no se puede cambiar
                        fecha: updatedFecha,
                        evento: updatedEvento,
                        descripcion: updatedDescripcion,
                        veterinario: updatedVeterinario,
                    });

                    Swal.fire({
                        icon: "success",
                        title: "Registro actualizado",
                        text: "El registro fue actualizado correctamente.",
                    });

                    closeModal("modal-edit-record");
                    cargarTodosLosHistoriales(); // Recargar la tabla con los datos actualizados
                } catch (error) {
                    console.error("Error al actualizar el registro:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: "No se pudo actualizar el registro.",
                    });
                }
            };
        } else {
            console.error("El registro no existe.");
            Swal.fire({
                icon: "error",
                title: "Registro no encontrado",
                text: "El registro seleccionado no existe en la base de datos.",
            });
        }
    } catch (error) {
        console.error("Error al obtener el registro para edición:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar el registro para editar.",
        });
    }
};

async function graficarEnfermedadesRecurrentes() {
    const enfermedades = {}; // Almacenar enfermedades y sus recuentos

    try {
        const querySnapshot = await getDocs(collection(db, "historialMedico"));

        querySnapshot.forEach((doc) => {
            const registro = doc.data();
            const evento = registro.evento || "Sin evento";

            // Contar eventos de enfermedad
            if (evento in enfermedades) {
                enfermedades[evento]++;
            } else {
                enfermedades[evento] = 1;
            }
        });

        // Configurar datos para la gráfica
        const labels = Object.keys(enfermedades);
        const data = Object.values(enfermedades);

        const canvas = document.getElementById("enfermedadesChart");
        if (!canvas) {
            console.error("El canvas con ID 'enfermedadesChart' no existe en el DOM.");
            return;
        }
        const ctx = canvas.getContext("2d");

        new Chart(ctx, {
            type: "pie", // Cambia a "bar" si prefieres barras
            data: {
                labels: labels,
                datasets: [{
                    label: "Porcentaje de Enfermedades Recurrentes",
                    data: data,
                    backgroundColor: [
                        "rgba(255, 99, 132, 0.6)",
                        "rgba(54, 162, 235, 0.6)",
                        "rgba(255, 206, 86, 0.6)",
                        "rgba(75, 192, 192, 0.6)",
                        "rgba(153, 102, 255, 0.6)",
                        "rgba(255, 159, 64, 0.6)"
                    ],
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar enfermedades recurrentes:", error);
    }
}


// Llamar a la función después de cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    graficarEnfermedadesRecurrentes();
});

async function graficarTasaRecuperacion() {
    let recuperadas = 0;
    let enTratamiento = 0;

    try {
        const querySnapshot = await getDocs(collection(db, "historialMedico"));

        querySnapshot.forEach((doc) => {
            const registro = doc.data();
            const evento = registro.evento || "";

            if (evento.toLowerCase().includes("recuperación")) {
                recuperadas++;
            } else if (evento.toLowerCase().includes("tratamiento")) {
                enTratamiento++;
            }
        });

        const ctx = document.getElementById("recuperacionChart").getContext("2d");
        new Chart(ctx, {
            type: "bar",
            data: {
                labels: ["Recuperadas", "En Tratamiento"],
                datasets: [{
                    label: "Tasa de Recuperación",
                    data: [recuperadas, enTratamiento],
                    backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 99, 132, 0.6)"]
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar tasa de recuperación:", error);
    }
}

// Llamar a la función después de cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    graficarTasaRecuperacion();
});

async function graficarEstadoDeSalud() {
    let buenEstado = 0;
    let regular = 0;
    let enfermas = 0;

    try {
        const querySnapshot = await getDocs(collection(db, "vacas"));

        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const estado = vaca.estadoSalud || "Desconocido";

            if (estado.toLowerCase() === "bueno") {
                buenEstado++;
            } else if (estado.toLowerCase() === "regular") {
                regular++;
            } else if (estado.toLowerCase() === "enfermo") {
                enfermas++;
            }
        });

        const ctx = document.getElementById("estadoSaludChart").getContext("2d");
        new Chart(ctx, {
            type: "pie", // Cambiar a "bar" si prefieres barras
            data: {
                labels: ["Buen Estado", "Regular", "Enfermas"],
                datasets: [{
                    label: "Estado de Salud de las Vacas",
                    data: [buenEstado, regular, enfermas],
                    backgroundColor: [
                        "rgba(75, 192, 192, 0.6)", // Verde
                        "rgba(255, 206, 86, 0.6)", // Amarillo
                        "rgba(255, 99, 132, 0.6)"  // Rojo
                    ],
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar estado de salud:", error);
    }
}

// Llamar a la función después de cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    graficarEstadoDeSalud();
});

async function graficarEventosPorFecha() {
    const eventosPorMes = {}; // Almacenar recuento de eventos por mes

    try {
        const querySnapshot = await getDocs(collection(db, "historialMedico"));

        querySnapshot.forEach((doc) => {
            const registro = doc.data();
            const fecha = registro.fecha || "";
            const mes = fecha.split("-").slice(0, 2).join("-"); // Extraer año-mes (formato YYYY-MM)

            if (mes in eventosPorMes) {
                eventosPorMes[mes]++;
            } else {
                eventosPorMes[mes] = 1;
            }
        });

        // Ordenar meses por fecha
        const sortedMeses = Object.keys(eventosPorMes).sort();

        const ctx = document.getElementById("eventosFechaChart").getContext("2d");
        new Chart(ctx, {
            type: "line",
            data: {
                labels: sortedMeses,
                datasets: [{
                    label: "Eventos Médicos por Mes",
                    data: sortedMeses.map((mes) => eventosPorMes[mes]),
                    borderColor: "rgba(54, 162, 235, 0.8)",
                    backgroundColor: "rgba(54, 162, 235, 0.2)",
                    fill: true,
                    tension: 0.3 // Suavizar las líneas
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar eventos por fecha:", error);
    }
}

// Llamar a la función después de cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    graficarEventosPorFecha();
});
document.addEventListener("DOMContentLoaded", () => {
    let isAuthChecked = false; // Variable para saber si el estado de autenticación ha sido verificado

   // Verifica el estado de autenticación
   onAuthStateChanged(auth, async (user) => {
       isAuthChecked = true;

       const inicbtn = document.getElementById("btn-inicio");
       const userInfo = document.querySelector(".user-info span");
       const profileIcon = document.getElementById("profile-icon");
       const logoutBtn = document.getElementById("logout-btn");
       const perfilbtn = document.getElementById("perfil-btn");
       const content = document.getElementById("content"); // Área de contenido principal

       if (user) {
           const idTokenResult = await user.getIdTokenResult();
           const isAdmin = idTokenResult.claims.admin || false;

           if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
           logoutBtn.classList.remove("hidden");
           perfilbtn.classList.remove("hidden");
           inicbtn.classList.add("hidden");

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


   // Manejo del perfil
   const profileIcon = document.getElementById("profile-icon");
   const profileMenu = document.getElementById("profile-menu");

   if (profileIcon) {
       profileIcon.addEventListener("click", () => {
           profileMenu.classList.toggle("active");
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

// Cerrar sesión
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
   logoutBtn.addEventListener("click", async () => {
       await signOut(auth);

       // Mostrar mensaje de éxito con SweetAlert2
       Swal.fire({
           title: 'Hasta pronto!',
           text: 'Has cerrado sesión.',
           icon: 'success',
           confirmButtonText: 'Aceptar'
       }).then(() => {
           // Verificar si ya estás en index.html
           if (window.location.pathname.includes("index.html")) {
               window.location.reload(); // Recargar la página si ya estás en index.html
           } else {
               window.location.href = "../index.html"; // Redirigir si estás en otra página
           }
       });
   });
}

});