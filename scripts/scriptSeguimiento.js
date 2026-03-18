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
    orderBy,
    limit,
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

// Perfil del usuario actual
let currentUserProfile = null;

// --- Código de MQTT Integrado ---
const mqttUrl = "wss://d5e57d2e51ce444ea8dd953e6f0ef5a6.s1.eu.hivemq.cloud:8884/mqtt";
const options = {
    username: "sergio",
    password: "Prueba123",
    protocol: "wss",
    reconnectPeriod: 1000
};
const client = mqtt.connect(mqttUrl, options);

client.on("connect", () => {
    client.subscribe("/topic/rfid", (err) => {
        if (err) Swal.fire("Error de suscripción", "No fue posible suscribirse al tópico.", "error");
    });
});
client.on("error", (err) => Swal.fire("Error de MQTT", `Error en la conexión MQTT: ${err}`, "error"));

client.on("message", (topic, message) => {
    if (topic === "/topic/rfid") {
        const rfidValue = message.toString().trim();
        const crecimientoModal = document.getElementById("modal-crecimiento");
        const salidaModal = document.getElementById("modal-salida");
        const filterAnimalInput = document.getElementById("filter-animal");

        if (crecimientoModal && !crecimientoModal.classList.contains("hidden")) {
            document.getElementById("id-interno-crecimiento").value = rfidValue;
        } else if (salidaModal && !salidaModal.classList.contains("hidden")) {
            document.getElementById("id-interno-salida").value = rfidValue;
        } else if(filterAnimalInput) {
            filterAnimalInput.value = rfidValue;
            filterAnimalInput.dispatchEvent(new Event('input'));
        }
    }
});

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('show');
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add("hidden");
        const inputs = modal.querySelectorAll("input, textarea, select");
        inputs.forEach(input => input.value = "");
    }
}
window.cerrarModal = cerrarModal;

// --- MANEJO DE FORMULARIOS ---
document.getElementById('btn-abrir-modal-crecimiento').addEventListener('click', () => abrirModal('modal-crecimiento'));
document.getElementById('btn-abrir-modal-salida').addEventListener('click', () => abrirModal('modal-salida'));

document.getElementById('form-crecimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserProfile) {
        Swal.fire("Error", "Debe iniciar sesión para registrar datos.", "error");
        return;
    }
    const idOerfid = document.getElementById('id-interno-crecimiento').value;
    const peso = document.getElementById('peso-crecimiento').value;
    const tamano = document.getElementById('tamano-crecimiento').value;

    try {
        const vacasRef = collection(db, "vacas");
        const qId = query(vacasRef, where("idInterno", "==", idOerfid));
        const qRfid = query(vacasRef, where("rfid", "==", idOerfid));
        const [idSnapshot, rfidSnapshot] = await Promise.all([getDocs(qId), getDocs(qRfid)]);
        const vacaDoc = idSnapshot.empty ? (rfidSnapshot.docs[0] || null) : idSnapshot.docs[0];

        if (!vacaDoc) {
            Swal.fire("Error", "No se encontró el animal con el ID o RFID proporcionado.", "error");
            return;
        }

        const vacaData = vacaDoc.data();
        const registro = {
            idInterno: vacaData.idInterno,
            peso: parseFloat(peso),
            tamano: parseFloat(tamano),
            fecha: new Date().toISOString(),
            createdBy: currentUserProfile.uid,
            groupName: currentUserProfile.groupName || null
        };

        await addDoc(collection(db, "gestionCrecimiento"), registro);
        Swal.fire("Éxito", "Registro de crecimiento guardado.", "success");
        cerrarModal('modal-crecimiento');
        await cargarHistorial();
        await cargarDatosGenerales();
    } catch (error) {
        Swal.fire("Error", "Ocurrió un error al guardar el registro.", "error");
    }
});

document.getElementById('form-salida').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUserProfile) {
        Swal.fire("Error", "Debe iniciar sesión para registrar datos.", "error");
        return;
    }
    const idOerfid = document.getElementById('id-interno-salida').value;
    const pesoSalida = document.getElementById('peso-salida').value;
    const fechaSalida = document.getElementById('fecha-salida').value;
    const horaSalida = document.getElementById('hora-salida').value;

    try {
        const vacasRef = collection(db, "vacas");
        const qId = query(vacasRef, where("idInterno", "==", idOerfid));
        const qRfid = query(vacasRef, where("rfid", "==", idOerfid));
        const [idSnapshot, rfidSnapshot] = await Promise.all([getDocs(qId), getDocs(qRfid)]);
        const vacaDoc = idSnapshot.empty ? (rfidSnapshot.docs[0] || null) : idSnapshot.docs[0];
        
        if (!vacaDoc) {
            Swal.fire("Error", "No se encontró el animal con el ID o RFID proporcionado.", "error");
            return;
        }

        const vacaData = vacaDoc.data();
        const registro = {
            idInterno: vacaData.idInterno,
            pesoSalida: parseFloat(pesoSalida),
            fechaSalida: fechaSalida,
            horaSalida: horaSalida,
            createdBy: currentUserProfile.uid,
            groupName: currentUserProfile.groupName || null
        };

        await addDoc(collection(db, "gestionSalidas"), registro);
        await setDoc(doc(db, "vacas", vacaDoc.id), { estado: "vendida" }, { merge: true });

        Swal.fire("Éxito", "Salida registrada y estado actualizado.", "success");
        cerrarModal('modal-salida');
        await cargarHistorial();
        await cargarDatosGenerales();
        await cargarDatosGraficaSalidas();
    } catch (error) {
        Swal.fire("Error", "Ocurrió un error al gestionar la salida.", "error");
    }
});


// --- CARGA DE DATOS ---

async function cargarHistorial() {
    const tablaHistorial = document.getElementById('historial-table');
    if (!tablaHistorial) return;
    tablaHistorial.innerHTML = '';
    
    if (!currentUserProfile) {
        tablaHistorial.innerHTML = '<tr><td colspan="5">Inicie sesión para ver los registros.</td></tr>';
        return;
    }

    try {
        const cambios = [];
        const colecciones = ['gestionCrecimiento', 'gestionSalidas'];
        
        for (const col of colecciones) {
            let q = collection(db, col);
            if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
                q = query(q, where("groupName", "==", currentUserProfile.groupName));
            } else if (!currentUserProfile.isAdmin) {
                q = query(q, where("createdBy", "==", currentUserProfile.uid));
            }
            
            const snapshot = await getDocs(q);
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const vacasRef = collection(db, 'vacas');
                const vacaSnapshot = await getDocs(query(vacasRef, where("idInterno", "==", data.idInterno)));
                let rfid = vacaSnapshot.empty ? 'N/A' : (vacaSnapshot.docs[0].data().rfid || 'N/A');
                
                if (col === 'gestionCrecimiento') {
                     cambios.push({
                        fecha: new Date(data.fecha).toLocaleDateString(),
                        hora: new Date(data.fecha).toLocaleTimeString(),
                        animal: `ID: ${data.idInterno || 'N/A'} / RFID: ${rfid}`,
                        cambio: 'Crecimiento',
                        detalles: `Peso: ${data.peso} kg, Tamaño: ${data.tamano || 'N/A'} cm`
                    });
                } else {
                    cambios.push({
                        fecha: data.fechaSalida || 'N/A',
                        hora: data.horaSalida || 'N/A',
                        animal: `ID: ${data.idInterno || 'N/A'} / RFID: ${rfid}`,
                        cambio: 'Salida',
                        detalles: `Peso Salida: ${data.pesoSalida} kg`
                    });
                }
            }
        }

        cambios.sort((a, b) => new Date(`${b.fecha} ${b.hora}`) - new Date(`${a.fecha} ${a.hora}`));
        
        if (cambios.length === 0) {
            tablaHistorial.innerHTML = '<tr><td colspan="5">No hay registros para mostrar.</td></tr>';
            return;
        }

        cambios.slice(0, 20).forEach(cambio => { // Limitar a los 20 más recientes
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td>${cambio.fecha}</td>
                <td>${cambio.hora}</td>
                <td>${cambio.animal}</td>
                <td>${cambio.cambio}</td>
                <td>${cambio.detalles}</td>
            `;
            tablaHistorial.appendChild(fila);
        });

    } catch (error) {
        console.error('Error al cargar el historial:', error);
        Swal.fire('Error', 'No se pudo cargar el historial de cambios.', 'error');
    }
}

// --- GRÁFICAS ---
let pesoChart, tamanoChart, chartSalidas;

function inicializarGraficas() {
    const commonOptions = (textY) => ({ 
        responsive: true, 
        maintainAspectRatio: true,
        plugins: { legend: { position: 'top' } },
        scales: { 
            x: { 
                title: { display: true, text: 'Fecha' }
            }, 
            y: { 
                title: { display: true, text: textY },
                beginAtZero: true
            }
        }
    });
    
    pesoChart = new Chart(document.getElementById('chart-peso').getContext('2d'), { type: 'line', data: { labels: [], datasets: [] }, options: commonOptions('Peso (kg)') });
    tamanoChart = new Chart(document.getElementById('chart-tamano').getContext('2d'), { type: 'line', data: { labels: [], datasets: [] }, options: commonOptions('Tamaño (cm)') });
    chartSalidas = new Chart(document.getElementById('chart-salidas').getContext('2d'), { type: 'bar', data: { labels: [], datasets: [{ label: 'Cantidad de Vacas', data: [], backgroundColor: 'rgba(75, 192, 192, 0.5)' }] }, options: commonOptions('Cantidad') });
}

async function cargarDatosGenerales() {
    if (!currentUserProfile) return;

    try {
        let q = collection(db, 'gestionCrecimiento');
        if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
            q = query(q, where("groupName", "==", currentUserProfile.groupName));
        } else if (!currentUserProfile.isAdmin) {
            q = query(q, where("createdBy", "==", currentUserProfile.uid));
        }
        
        const snapshot = await getDocs(q);

        // Limpiar gráficas si no hay datos
        if (snapshot.empty) {
            pesoChart.data.labels = [];
            pesoChart.data.datasets = [];
            pesoChart.update();
            tamanoChart.data.labels = [];
            tamanoChart.data.datasets = [];
            tamanoChart.update();
            return;
        }

        const crecimientoDatos = snapshot.docs.map(doc => ({
            ...doc.data(),
            fecha: new Date(doc.data().fecha) // Asegurarse que `fecha` es un objeto Date
        }));

        // 1. Obtener todas las fechas únicas y ordenarlas
        const allLabels = [...new Set(crecimientoDatos.map(d => d.fecha.toLocaleDateString()))]
            .sort((a, b) => new Date(a) - new Date(b));

        // 2. Agrupar los datos por ID de animal
        const datosPorAnimal = crecimientoDatos.reduce((acc, dato) => {
            const id = dato.idInterno;
            if (!acc[id]) {
                acc[id] = [];
            }
            acc[id].push(dato);
            return acc;
        }, {});

        // 3. Crear los datasets para cada animal
        const pesoDatasets = [];
        const tamanoDatasets = [];
        let colorIndex = 0;

        for (const idInterno in datosPorAnimal) {
            const animalData = datosPorAnimal[idInterno];
            const color = `hsl(${(colorIndex * 60)}, 70%, 50%)`;
            
            // Mapear los datos del animal a la lista completa de etiquetas (fechas)
            const pesoDataPoints = allLabels.map(label => {
                const dataPoint = animalData.find(d => d.fecha.toLocaleDateString() === label);
                return dataPoint ? dataPoint.peso : null;
            });

            const tamanoDataPoints = allLabels.map(label => {
                const dataPoint = animalData.find(d => d.fecha.toLocaleDateString() === label);
                return dataPoint ? dataPoint.tamano : null;
            });

            pesoDatasets.push({
                label: `ID: ${idInterno}`,
                data: pesoDataPoints,
                borderColor: color,
                tension: 0.1,
                fill: false,
                spanGaps: true // CLAVE: Conecta la línea aunque haya puntos nulos (null)
            });

            tamanoDatasets.push({
                label: `ID: ${idInterno}`,
                data: tamanoDataPoints,
                borderColor: color,
                tension: 0.1,
                fill: false,
                spanGaps: true // CLAVE: Conecta la línea aunque haya puntos nulos (null)
            });

            colorIndex++;
        }

        // 4. Actualizar las gráficas
        pesoChart.data.labels = allLabels;
        pesoChart.data.datasets = pesoDatasets;
        pesoChart.update();

        tamanoChart.data.labels = allLabels;
        tamanoChart.data.datasets = tamanoDatasets;
        tamanoChart.update();

    } catch (error) {
        console.error('Error al cargar datos generales para gráficas:', error);
    }
}


async function cargarDatosGraficaSalidas() {
    if (!currentUserProfile) return;
    try {
        let q = collection(db, 'gestionSalidas');
        if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
            q = query(q, where("groupName", "==", currentUserProfile.groupName));
        } else if (!currentUserProfile.isAdmin) {
            q = query(q, where("createdBy", "==", currentUserProfile.uid));
        }
        
        const snapshot = await getDocs(q);
        
        const datosMensuales = snapshot.docs.reduce((acc, doc) => {
            const fecha = new Date(doc.data().fechaSalida);
            const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            acc[mes] = (acc[mes] || 0) + 1;
            return acc;
        }, {});

        const meses = Object.keys(datosMensuales).sort();
        const cantidades = meses.map(mes => datosMensuales[mes]);

        chartSalidas.data.labels = meses;
        chartSalidas.data.datasets[0].data = cantidades;
        chartSalidas.update();

    } catch (error) {
        console.error('Error al cargar datos de gráfica de salidas:', error);
    }
}


function configurarFiltrosTabla() {
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('input', () => {
            const filters = {
                fecha: document.getElementById('filter-fecha').value.toLowerCase().trim(),
                animal: document.getElementById('filter-animal').value.toLowerCase().trim(),
                cambio: document.getElementById('filter-cambio').value.toLowerCase().trim()
            };
            
            document.querySelectorAll('#historial-table tbody tr').forEach(fila => {
                const cells = {
                    fecha: fila.cells[0]?.textContent.toLowerCase() || '',
                    animal: fila.cells[2]?.textContent.toLowerCase() || '',
                    cambio: fila.cells[3]?.textContent.toLowerCase() || ''
                };
                const coincide = Object.keys(filters).every(key => !filters[key] || cells[key].includes(filters[key]));
                fila.style.display = coincide ? '' : 'none';
            });
        });
    });
}

// --- INICIALIZACIÓN GENERAL ---
document.addEventListener("DOMContentLoaded", () => {
    inicializarGraficas();
    configurarFiltrosTabla();

    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => navMenu.classList.toggle('show'));
    }

    const perfilBtn = document.getElementById("perfil-btn");
    if (perfilBtn) {
       perfilBtn.addEventListener("click", () => window.location.href = "../screens/perfil.html");
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
    
    // --- LÓGICA DE AUTENTICACIÓN Y UI ---
    onAuthStateChanged(auth, async (user) => {
        const userInfo = document.querySelector(".user-info span");
        const logoutBtn = document.getElementById("logout-btn");
        const perfilbtn = document.getElementById("perfil-btn");

        if (user) {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            const idTokenResult = await user.getIdTokenResult();

            let userData = {};
            if (userDocSnap.exists()) userData = userDocSnap.data();

            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'individual',
                groupName: userData.groupName || null,
                isAdmin: idTokenResult.claims.admin || false
            };
            
            if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
            if (logoutBtn) logoutBtn.classList.remove("hidden");
            if (perfilbtn) perfilbtn.classList.remove("hidden");
            if (currentUserProfile.isAdmin) {
                const adminPanelBtn = document.getElementById("btn-panel");
                if (adminPanelBtn) adminPanelBtn.classList.remove("hidden");
            }
            
            await cargarHistorial();
            await cargarDatosGenerales();
            await cargarDatosGraficaSalidas();

        } else {
            currentUserProfile = null;
            if (userInfo) userInfo.textContent = "Iniciar sesión";
            if (logoutBtn) logoutBtn.classList.add("hidden");
            if (perfilbtn) perfilbtn.classList.add("hidden");
            
            // Limpiar datos
            const tablaHistorial = document.getElementById('historial-table');
            if (tablaHistorial) tablaHistorial.innerHTML = '<tr><td colspan="5">Inicie sesión para ver los registros.</td></tr>';
            
            if(pesoChart) { pesoChart.data.labels = []; pesoChart.data.datasets = []; pesoChart.update(); }
            if(tamanoChart) { tamanoChart.data.labels = []; tamanoChart.data.datasets = []; tamanoChart.update(); }
            if(chartSalidas) { chartSalidas.data.labels = []; chartSalidas.data.datasets[0].data = []; chartSalidas.update(); }
        }
    });
});
