import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import {
    getAuth,
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
    getDocs
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

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
let currentUserProfile = null;
let charts = {}; // Objeto para almacenar instancias de gráficos

// --- LÓGICA DE AUTENTICACIÓN Y PERFIL DE USUARIO ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        const idTokenResult = await user.getIdTokenResult();
        const isAdmin = idTokenResult.claims.admin || false;

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'individual',
                groupName: userData.groupName || null,
                isAdmin: isAdmin
            };
        } else {
            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: 'individual',
                groupName: null,
                isAdmin: isAdmin
            };
        }
        
        // Actualizar UI y cargar datos
        updateUIAfterLogin(user.email, isAdmin);
        loadInitialData();

    } else {
        currentUserProfile = null;
        // Limpiar UI y datos
        updateUIAfterLogout();
        clearTableAndCharts();
    }
});


function getQueryForUser(collectionName) {
    if (!currentUserProfile) return null;
    const baseCollection = collection(db, collectionName);
    if (currentUserProfile.isAdmin) {
        return query(baseCollection);
    }
    if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
        return query(baseCollection, where("groupName", "==", currentUserProfile.groupName));
    }
    return query(baseCollection, where("createdBy", "==", currentUserProfile.uid));
}

async function loadInitialData() {
    await cargarTodosLosHistoriales();
    await graficarEnfermedadesRecurrentes();
    await graficarTasaRecuperacion();
    await graficarEstadoDeSalud();
    await graficarEventosPorFecha();
}

function clearTableAndCharts() {
    const tableBody = document.querySelector("#history-table tbody");
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="6">Inicie sesión para ver los datos.</td></tr>`;
    
    // Destruir gráficos existentes para evitar errores
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};
}


// === MANEJO DE LA INTERFAZ DE USUARIO (LOGIN/LOGOUT) ===
function updateUIAfterLogin(email, isAdmin) {
    const userInfo = document.querySelector(".user-info span");
    if (userInfo) userInfo.textContent = `Bienvenido, ${email}`;
    
    document.getElementById("logout-btn").classList.remove("hidden");
    document.getElementById("perfil-btn").classList.remove("hidden");
    document.getElementById("btn-inicio").classList.add("hidden");

    if (isAdmin) {
        document.getElementById("btn-panel").classList.remove("hidden");
    }
}

function updateUIAfterLogout() {
    const userInfo = document.querySelector(".user-info span");
    if (userInfo) userInfo.textContent = "Iniciar sesión";

    document.getElementById("logout-btn").classList.add("hidden");
    document.getElementById("perfil-btn").classList.add("hidden");
    document.getElementById("btn-inicio").classList.remove("hidden");
    document.getElementById("btn-panel").classList.add("hidden");
}


// --- CARGA DE DATOS ---
async function cargarTodosLosHistoriales() {
    const tableBody = document.querySelector("#history-table tbody");
    const vacasQuery = getQueryForUser("vacas");
    
    if (!vacasQuery) {
        tableBody.innerHTML = `<tr><td colspan="6">Inicie sesión para ver los datos.</td></tr>`;
        return;
    }

    try {
        // 1. Obtener los animales permitidos para el usuario
        const vacasSnapshot = await getDocs(vacasQuery);
        if (vacasSnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="6">No se encontraron animales para su perfil.</td></tr>`;
            return;
        }

        const allowedRfids = vacasSnapshot.docs.map(doc => doc.data().rfid);
        const vacasDataMap = new Map(vacasSnapshot.docs.map(doc => [doc.data().rfid, doc.data()]));

        // 2. Obtener los historiales médicos de esos animales
        const historialQuery = query(collection(db, "historialMedico"), where("rfid", "in", allowedRfids));
        const historialSnapshot = await getDocs(historialQuery);

        tableBody.innerHTML = "";
        if (historialSnapshot.empty) {
            tableBody.innerHTML = `<tr><td colspan="6">No hay historiales registrados para sus animales.</td></tr>`;
            return;
        }

        // 3. Renderizar la tabla
        historialSnapshot.forEach(doc => {
            const historial = doc.data();
            const vacaInfo = vacasDataMap.get(historial.rfid) || { idInterno: "N/A", rfid: historial.rfid };
            const row = crearFilaHistorial(historial, doc.id, vacaInfo);
            tableBody.appendChild(row);
        });

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
                <span class="action-icon recovered-icon" title="Marcar como Recuperada" onclick="marcarComoRecuperada('${id}')">
                    <i class="material-icons">check_circle</i>
                </span>
            </div>
        </td>
    `;
    return row;
}


// --- GRÁFICOS ---
async function renderChart(canvasId, type, labels, data, label, backgroundColors) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }

    const defaultColors = [
        "rgba(54, 162, 235, 0.7)", "rgba(255, 99, 132, 0.7)",
        "rgba(255, 206, 86, 0.7)", "rgba(75, 192, 192, 0.7)",
        "rgba(153, 102, 255, 0.7)", "rgba(255, 159, 64, 0.7)"
    ];

    charts[canvasId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: backgroundColors || defaultColors,
                borderColor: "rgba(255, 255, 255, 0.8)",
                borderWidth: 1,
                fill: type === 'line',
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
        }
    });
}

async function graficarEstadoDeSalud() {
    if (!currentUserProfile) return;
    const vacasQuery = getQueryForUser("vacas");
    if (!vacasQuery) return;

    const estados = { "Bueno": 0, "Regular": 0, "Enfermo": 0 };
    const querySnapshot = await getDocs(vacasQuery);
    querySnapshot.forEach((doc) => {
        const estado = doc.data().estadoSalud;
        if (estado in estados) {
            estados[estado]++;
        }
    });

    const labels = Object.keys(estados);
    const data = Object.values(estados);
    
    // Colores profesionales y semánticos
    const backgroundColors = [
        'rgba(40, 167, 69, 0.7)',   // Verde para "Bueno"
        'rgba(255, 193, 7, 0.7)',    // Amarillo para "Regular"
        'rgba(220, 53, 69, 0.7)'     // Rojo para "Enfermo"
    ];

    renderChart("estadoSaludChart", "pie", labels, data, "Estado de Salud", backgroundColors);
}

async function graficarEnfermedadesRecurrentes() {
    if (!currentUserProfile) return;
    const historialQuery = getQueryForUser("historialMedico");
    if (!historialQuery) return;

    const enfermedades = {};
    const querySnapshot = await getDocs(historialQuery);
    querySnapshot.forEach((doc) => {
        const evento = doc.data().evento || "Sin evento";
        if(evento !== "Sin evento"){
             enfermedades[evento] = (enfermedades[evento] || 0) + 1;
        }
    });

    renderChart("enfermedadesChart", "pie", Object.keys(enfermedades), Object.values(enfermedades), "Enfermedades Recurrentes");
}

async function graficarTasaRecuperacion() {
    if (!currentUserProfile) return;
    const historialQuery = getQueryForUser("historialMedico");
    if (!historialQuery) return;

    let recuperadas = 0, enTratamiento = 0;
    const querySnapshot = await getDocs(historialQuery);
    querySnapshot.forEach((doc) => {
        const evento = (doc.data().evento || "").toLowerCase();
        if (evento.includes("recuperación")) recuperadas++;
        else if (evento.includes("tratamiento")) enTratamiento++;
    });

    renderChart("recuperacionChart", "bar", ["Recuperadas", "En Tratamiento"], [recuperadas, enTratamiento], "Tasa de Recuperación");
}

async function graficarEventosPorFecha() {
    if (!currentUserProfile) return;
    const historialQuery = getQueryForUser("historialMedico");
    if (!historialQuery) return;

    const eventosPorMes = {};
    const querySnapshot = await getDocs(historialQuery);
    querySnapshot.forEach((doc) => {
        const fecha = doc.data().fecha || "";
        if(fecha){
            const mes = fecha.substring(0, 7); // YYYY-MM
            eventosPorMes[mes] = (eventosPorMes[mes] || 0) + 1;
        }
    });

    const sortedMeses = Object.keys(eventosPorMes).sort();
    const data = sortedMeses.map(mes => eventosPorMes[mes]);
    renderChart("eventosFechaChart", "line", sortedMeses, data, "Eventos por Mes");
}


// --- MODALES Y FORMULARIOS ---
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
        if (document.querySelectorAll('.modal.active').length === 0) {
            document.getElementById("overlay").classList.remove("active");
        }
    }
};

// Abrir modal para agregar
document.getElementById("add-record-btn").addEventListener("click", () => {
    document.getElementById("add-record-form").reset();
    openModal("modal-add-record");
});

// Enviar formulario de agregar
document.getElementById("add-record-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUserProfile) return Swal.fire("Error", "Debe iniciar sesión para agregar registros.", "error");

    const animalId = document.getElementById("animal-id").value.trim();
    
    // Verificar que el animal existe y que el usuario tiene permisos sobre él.
    const q = query(collection(db, "vacas"), where("rfid", "==", animalId));
    const vacaSnapshot = await getDocs(q);

    if (vacaSnapshot.empty) {
        return Swal.fire("Error", `No existe un animal con el RFID: ${animalId}`, "error");
    }

    // Aquí podrías agregar una verificación de permisos más estricta si es necesario
    
    try {
        await addDoc(collection(db, "historialMedico"), {
            rfid: animalId,
            fecha: document.getElementById("event-date").value,
            evento: document.getElementById("event-type").value,
            descripcion: document.getElementById("description").value.trim(),
            veterinario: document.getElementById("veterinarian").value.trim(),
            createdBy: currentUserProfile.uid,
            groupName: currentUserProfile.groupName || null
        });

        Swal.fire("Éxito", "Registro agregado correctamente.", "success");
        closeModal("modal-add-record");
        loadInitialData();
    } catch (error) {
        Swal.fire("Error", "No se pudo agregar el registro.", "error");
    }
});

// --- ACCIONES DE EDICIÓN Y ELIMINACIÓN ---
window.editarRegistro = async (id) => {
    const registroRef = doc(db, "historialMedico", id);
    const registroSnap = await getDoc(registroRef);

    if (registroSnap.exists()) {
        const registro = registroSnap.data();

        // Llenar formulario de edición
        document.getElementById("edit-animal-id").value = registro.rfid;
        document.getElementById("edit-event-date").value = registro.fecha;
        document.getElementById("edit-event-type").value = registro.evento;
        document.getElementById("edit-description").value = registro.descripcion;
        document.getElementById("edit-veterinarian").value = registro.veterinario;
        
        openModal("modal-edit-record");
        
        // Manejar el guardado de la edición
        document.getElementById("edit-record-form").onsubmit = async (e) => {
            e.preventDefault();
            try {
                await setDoc(registroRef, {
                    ...registro, // Mantener campos originales como createdBy
                    fecha: document.getElementById("edit-event-date").value,
                    evento: document.getElementById("edit-event-type").value,
                    descripcion: document.getElementById("edit-description").value.trim(),
                    veterinario: document.getElementById("edit-veterinarian").value.trim(),
                });
                Swal.fire("Éxito", "Registro actualizado.", "success");
                closeModal("modal-edit-record");
                loadInitialData();
            } catch (error) {
                Swal.fire("Error", "No se pudo actualizar el registro.", "error");
            }
        };
    }
};

window.eliminarRegistro = async (id) => {
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "No podrás revertir esta acción.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, ¡eliminar!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, "historialMedico", id));
            Swal.fire("Eliminado", "El registro ha sido eliminado.", "success");
            loadInitialData();
        } catch (error) {
            Swal.fire("Error", "No se pudo eliminar el registro.", "error");
        }
    }
};

window.marcarComoRecuperada = async (historialId) => {
    const result = await Swal.fire({
        title: '¿Marcar como Recuperada?',
        text: "Esto cambiará el estado de salud del animal a 'Bueno' y añadirá un nuevo registro de recuperación.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Sí, marcar como recuperada',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const historialRef = doc(db, "historialMedico", historialId);
            const historialSnap = await getDoc(historialRef);

            if (!historialSnap.exists()) {
                return Swal.fire("Error", "El registro de historial no existe.", "error");
            }

            const historialData = historialSnap.data();
            const rfid = historialData.rfid;

            const q = query(collection(db, "vacas"), where("rfid", "==", rfid));
            const vacaSnapshot = await getDocs(q);

            if (vacaSnapshot.empty) {
                return Swal.fire("Error", `No se encontró la vaca con RFID: ${rfid}`, "error");
            }

            const vacaDoc = vacaSnapshot.docs[0];
            await setDoc(vacaDoc.ref, { estadoSalud: "Bueno" }, { merge: true });

            await addDoc(collection(db, "historialMedico"), {
                rfid: rfid,
                fecha: new Date().toISOString().split('T')[0], // Fecha actual
                evento: "Recuperación",
                descripcion: "El animal ha sido marcado como recuperado.",
                veterinario: historialData.veterinario, // Opcional: puedes cambiarlo si es necesario
                createdBy: currentUserProfile.uid,
                groupName: currentUserProfile.groupName || null
            });

            Swal.fire("Éxito", "El animal ha sido marcado como recuperado.", "success");
            loadInitialData(); // Recargar datos para ver los cambios

        } catch (error) {
            console.error("Error al marcar como recuperada:", error);
            Swal.fire("Error", "No se pudo completar la acción.", "error");
        }
    }
};

// --- FILTROS DE LA TABLA ---
function filtrarRegistros() {
    const filters = {
        rfid: document.getElementById("filter-rfid").value.toLowerCase().trim(),
        date: document.getElementById("filter-date").value,
        event: document.getElementById("filter-event").value.toLowerCase().trim(),
        description: document.getElementById("filter-description").value.toLowerCase().trim(),
        veterinarian: document.getElementById("filter-veterinarian").value.toLowerCase().trim()
    };
    
    const rows = document.querySelectorAll("#history-table tbody tr");

    rows.forEach(row => {
        const cells = {
            rfid: row.querySelector("td:nth-child(1)").textContent.toLowerCase(),
            date: row.querySelector("td:nth-child(2)").textContent,
            event: row.querySelector("td:nth-child(3)").textContent.toLowerCase(),
            description: row.querySelector("td:nth-child(4)").textContent.toLowerCase(),
            veterinarian: row.querySelector("td:nth-child(5)").textContent.toLowerCase()
        };

        const isVisible = 
            (filters.rfid === "" || cells.rfid.includes(filters.rfid)) &&
            (filters.date === "" || cells.date.includes(filters.date)) &&
            (filters.event === "" || cells.event.includes(filters.event)) &&
            (filters.description === "" || cells.description.includes(filters.description)) &&
            (filters.veterinarian === "" || cells.veterinarian.includes(filters.veterinarian));
        
        row.style.display = isVisible ? "" : "none";
    });
}

// Asignar eventos a los inputs de filtro
document.querySelectorAll(".filter-input").forEach(input => {
    input.addEventListener("input", filtrarRegistros);
});

// Mostrar/ocultar filtros
window.toggleFilters = function() {
    document.getElementById("filters-container").classList.toggle("active");
};

// --- MQTT ---
const mqttUrl = "wss://d5e57d2e51ce444ea8dd953e6f0ef5a6.s1.eu.hivemq.cloud:8884/mqtt";
const options = { username: "sergio", password: "Prueba123", protocol: "wss", reconnectPeriod: 1000 };
const client = mqtt.connect(mqttUrl, options);

client.on("connect", () => {
    client.subscribe("/topic/rfid", (err) => {
        if (err) console.error("Error al suscribirse al tópico:", err);
    });
});

client.on("message", (topic, message) => {
    if (topic === "/topic/rfid") {
        const rfidValue = message.toString().trim();
        
        // Rellenar campo de filtro
        const rfidFilterInput = document.getElementById("filter-rfid");
        if (rfidFilterInput) {
            rfidFilterInput.value = rfidValue;
            filtrarRegistros();
        }
        
        // Rellenar campo en modal de agregar
        const animalIdInput = document.getElementById("animal-id");
        if(document.getElementById('modal-add-record').classList.contains('active')){
             animalIdInput.value = rfidValue;
        }
    }
});
