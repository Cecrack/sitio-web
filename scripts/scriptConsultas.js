import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import {
    doc,
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    setDoc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBGlP6JI7CnJh-MXVrzNfuZlVDUnW51jHc",
    authDomain: "ganaderia-d357d.firebaseapp.com",
    projectId: "ganaderia-d357d",
    storageBucket: "ganaderia-d357d.firebasestorage.app",
    messagingSenderId: "490392434742",
    appId: "1:490392434742:web:69d99d8ae9787abfb80097",
    measurementId: "G-Q55L8JX9WX"
};

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUserProfile = null;

// --- Código MQTT (se mantiene igual) ---
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
        const rfidValue = message.toString().trim();
        console.log("RFID recibido:", rfidValue);
        const rfidFilterInput = document.getElementById("filter-rfid");
        if (rfidFilterInput) {
            rfidFilterInput.value = rfidValue;
            filtrarTarjetas(); // Aplica el filtro automáticamente
        }
    }
});

client.on("error", (err) => {
    console.error("Error en la conexión MQTT:", err);
});

// --- LÓGICA DE AUTENTICACIÓN Y CARGA DE DATOS ---
onAuthStateChanged(auth, async (user) => {
    const cardsContainer = document.getElementById("cards-container");
    const userInfo = document.querySelector(".user-info span");

    if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'individual',
                groupName: userData.groupName || null,
                isAdmin: userData.role === 'admin'
            };
        } else {
            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: 'individual',
                groupName: null,
                isAdmin: false
            };
        }

        if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
        loadVacas(); // Cargar datos una vez que el perfil está listo

    } else {
        currentUserProfile = null;
        if (userInfo) userInfo.textContent = "Iniciar sesión";
        if (cardsContainer) {
            cardsContainer.innerHTML = '<p class="login-prompt">Inicie sesión para ver los datos.</p>';
        }
    }
});

// --- CARGA Y VISUALIZACIÓN DE DATOS (NUEVA LÓGICA) ---
async function loadVacas() {
    const cardsContainer = document.getElementById("cards-container");
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '<p>Cargando...</p>';

    if (!currentUserProfile) {
        cardsContainer.innerHTML = '<p class="login-prompt">Inicie sesión para ver los datos.</p>';
        return;
    }

    try {
        const vacasRef = collection(db, "vacas");
        let queries = [];

        if (currentUserProfile.isAdmin) {
            // El admin obtiene todos los documentos.
            queries.push(getDocs(query(vacasRef)));
        } else {
            // Consultas para usuarios no-admin.
            queries.push(getDocs(query(vacasRef, where("createdBy", "==", currentUserProfile.uid))));
            if (currentUserProfile.groupName) {
                queries.push(getDocs(query(vacasRef, where("groupName", "==", currentUserProfile.groupName))));
            }
        }

        const querySnapshots = await Promise.all(queries);
        const uniqueDocs = new Map();

        querySnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                if (!uniqueDocs.has(doc.id)) {
                    uniqueDocs.set(doc.id, { id: doc.id, ...doc.data() });
                }
            });
        });

        cardsContainer.innerHTML = ""; // Limpiar el estado de carga/anterior
        if (uniqueDocs.size === 0) {
            cardsContainer.innerHTML = '<p class="no-data-message">No se encontraron animales registrados para su perfil.</p>';
            return;
        }

        uniqueDocs.forEach(vaca => {
            const card = document.createElement("div");
            const cardClass = vaca.estado === "vendida" ? "card sold" : "card";
            card.classList.add(...cardClass.split(" "));

            card.innerHTML = `
                <img src="${vaca.fotoURL || 'default-image.jpg'}" alt="Foto de ${vaca.idInterno}">
                <div class="card-header">${vaca.idInterno || 'N/A'}</div>
                <div class="card-content">
                    <p><strong>RFID:</strong> ${vaca.rfid || 'N/A'}</p>
                    <p><strong>Raza:</strong> ${vaca.raza || 'N/A'}</p>
                    <p><strong>Sexo:</strong> ${vaca.sexo || 'N/A'}</p>
                    <p><strong>Estado de Salud:</strong> ${vaca.estadoSalud || 'N/A'}</p>
                    <p><strong>Ubicación:</strong> ${vaca.ubicacion || 'N/A'}</p>
                    <p><strong>Estado:</strong> ${vaca.estado || 'N/A'}</p>
                </div>
                <div class="card-actions">
                    <button class="edit-btn" onclick="window.openEditModal('${vaca.id}')">Editar</button>
                </div>
            `;
            cardsContainer.appendChild(card);
        });

    } catch (error) {
        console.error("Error al cargar los datos:", error);
        cardsContainer.innerHTML = '<p class="error-message">Error al cargar los datos. Verifique los permisos.</p>';
    }
}


// --- FUNCIONALIDAD DE EDICIÓN (MODAL) ---
window.openEditModal = async (id) => {
    const modal = document.getElementById("edit-vaca-modal");
    const overlay = document.getElementById("overlay");
    const vacaRef = doc(db, "vacas", id);
    const vacaDoc = await getDoc(vacaRef);

    if (vacaDoc.exists()) {
        const vaca = vacaDoc.data();
        document.getElementById("edit-vaca-form").dataset.docId = id; // Guardar el ID en el formulario
        document.getElementById("edit-id-interno").value = vaca.idInterno || "";
        document.getElementById("edit-rfid").value = vaca.rfid || "";
        document.getElementById("edit-raza").value = vaca.raza || "";
        document.getElementById("edit-sexo").value = vaca.sexo || "";
        document.getElementById("edit-estado-salud").value = vaca.estadoSalud || "";
        document.getElementById("edit-peso").value = vaca.peso || "";
        document.getElementById("edit-ubicacion").value = vaca.ubicacion || "";
        document.getElementById("edit-observaciones").value = vaca.observaciones || "";
        document.getElementById("edit-image-preview").src = vaca.fotoURL || "default-image.jpg";

        modal.classList.add("active");
        overlay.classList.add("active");
    }
};

document.getElementById("edit-vaca-form").onsubmit = async (e) => {
    e.preventDefault();
    const id = e.target.dataset.docId;
    if (!id) return;
    const vacaRef = doc(db, "vacas", id);

    try {
        await setDoc(vacaRef, {
            idInterno: document.getElementById("edit-id-interno").value,
            rfid: document.getElementById("edit-rfid").value,
            raza: document.getElementById("edit-raza").value,
            sexo: document.getElementById("edit-sexo").value,
            estadoSalud: document.getElementById("edit-estado-salud").value,
            peso: document.getElementById("edit-peso").value,
            ubicacion: document.getElementById("edit-ubicacion").value,
            observaciones: document.getElementById("edit-observaciones").value
        }, { merge: true });

        closeEditModal();
        loadVacas(); // Recargar los datos para reflejar los cambios
        Swal.fire('Éxito', 'Los datos del animal han sido actualizados.', 'success');
    } catch (error) {
        console.error("Error updating document: ", error);
        Swal.fire('Error', `No se pudo actualizar: ${error.message}`, 'error');
    }
};

function closeEditModal() {
    const modal = document.getElementById("edit-vaca-modal");
    const overlay = document.getElementById("overlay");
    modal.classList.remove("active");
    overlay.classList.remove("active");
}

// --- FILTRADO DE TARJETAS (CLIENT-SIDE) ---
function filtrarTarjetas() {
    const rfidValue = document.getElementById("filter-rfid").value.toLowerCase().trim();
    const razaValue = document.getElementById("filter-raza").value.toLowerCase().trim();
    const estadoSaludValue = document.getElementById("filter-estado-salud").value.toLowerCase().trim();
    const ubicacionValue = document.getElementById("filter-ubicacion").value.toLowerCase().trim();

    const cards = document.querySelectorAll(".card");

    cards.forEach((card) => {
        const header = card.querySelector(".card-header");
        const content = card.querySelector(".card-content");
        if (!header || !content) return;

        const idInterno = header.textContent.toLowerCase();
        const rfid = content.querySelector("p:nth-child(1)")?.textContent.toLowerCase() || '';
        const raza = content.querySelector("p:nth-child(2)")?.textContent.toLowerCase() || '';
        const estadoSalud = content.querySelector("p:nth-child(4)")?.textContent.toLowerCase() || '';
        const ubicacion = content.querySelector("p:nth-child(5)")?.textContent.toLowerCase() || '';

        const matchesFilter = 
            (rfidValue === "" || rfid.includes(rfidValue) || idInterno.includes(rfidValue)) &&
            (razaValue === "" || raza.includes(razaValue)) &&
            (estadoSaludValue === "" || estadoSalud.includes(estadoSaludValue)) &&
            (ubicacionValue === "" || ubicacion.includes(ubicacionValue));

        card.style.display = matchesFilter ? "" : "none";
    });
}

// --- INICIALIZACIÓN DE EVENTOS ---
document.addEventListener("DOMContentLoaded", () => {
    const filterInputs = document.querySelectorAll(".filter-input");
    filterInputs.forEach(input => input.addEventListener("input", filtrarTarjetas));

    const closeButton = document.querySelector("#edit-vaca-modal .close-button");
    if (closeButton) closeButton.addEventListener("click", closeEditModal);
    
    const overlay = document.getElementById("overlay");
    if (overlay) overlay.addEventListener("click", closeEditModal);
});
