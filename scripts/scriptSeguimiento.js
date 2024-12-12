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
    orderBy,
    limit,
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
            Swal.fire("Error de suscripción", "No fue posible suscribirse al tópico.", "error");
        }
    });
});

client.on("error", (err) => {
    Swal.fire("Error de MQTT", `Error en la conexión MQTT: ${err}`, "error");
});

// Escucha datos del lector RFID
client.on("message", (topic, message) => {
    if (topic === "/topic/rfid") {
        const rfidValue = message.toString().trim();
        console.log("RFID recibido:", rfidValue);

        // Identifica el input activo según el modal abierto
        const crecimientoModal = document.getElementById("modal-crecimiento");
        const salidaModal = document.getElementById("modal-salida");

        if (crecimientoModal && !crecimientoModal.classList.contains("hidden")) {
            const crecimientoInput = document.getElementById("id-interno-crecimiento");
            crecimientoInput.value = rfidValue;
        } else if (salidaModal && !salidaModal.classList.contains("hidden")) {
            const salidaInput = document.getElementById("id-interno-salida");
            salidaInput.value = rfidValue;
        } else {
            console.warn("Ningún modal abierto para manejar el RFID.");
        }
    }
});

// Escucha datos del lector RFID
client.on("message", (topic, message) => {
    if (topic === "/topic/rfid") {
        const rfidValue = message.toString().trim();
        console.log("RFID recibido:", rfidValue);

        // Identificar el campo de filtrado por animal
        const filterAnimalInput = document.getElementById("filter-animal");
        
        // Asignar el valor recibido del RFID al campo de filtro
        filterAnimalInput.value = rfidValue;

        // Activar el evento de input para aplicar automáticamente el filtro
        const event = new Event('input');
        filterAnimalInput.dispatchEvent(event);
    }
});

// Función para manejar RFID recibido
async function handleRFID(rfid) {
  const vacasRef = collection(db, "vacas");
  const querySnapshot = await getDocs(query(vacasRef, where("rfid", "==", rfid)));

  if (!querySnapshot.empty) {
    const data = querySnapshot.docs[0].data();
    Swal.fire("RFID Detectado", `RFID: ${data.rfid}, Animal: ${data.idInterno}`, "info");
  } else {
    Swal.fire("RFID no encontrado", "No se encontró el animal con el RFID proporcionado.", "warning");
  }
}

function abrirModal(modalId) {
    console.log("Se abre modal: ");
    const modal = document.getElementById(modalId);
    modal.classList.remove('hidden');
    modal.classList.add('show');
}

// Función para cerrar el modal y limpiar sus campos
function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        // Ocultar el modal
        modal.classList.add("hidden");

        // Limpia todos los campos del formulario dentro del modal
        const inputs = modal.querySelectorAll("input, textarea, select");
        inputs.forEach((input) => {
            if (input.type === "checkbox" || input.type === "radio") {
                input.checked = false; // Desmarca checkboxes y radios
            } else {
                input.value = ""; // Limpia valores de texto, número, fecha, etc.
            }
        });
        console.log("Se cerro el modal con function");
    } else {
        console.warn(`Modal con ID ${modalId} no encontrado.`);
    }
}



// Abrir modal para registrar crecimiento
document.getElementById('btn-abrir-modal-crecimiento').addEventListener('click', () => {
    abrirModal('modal-crecimiento');
});

// Abrir modal para gestionar salida
document.getElementById('btn-abrir-modal-salida').addEventListener('click', () => {
    abrirModal('modal-salida');
});

// Manejar el formulario de registrar crecimiento
document.getElementById('form-crecimiento').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idOerfid = document.getElementById('id-interno-crecimiento').value;
    const peso = document.getElementById('peso-crecimiento').value;
    const tamano = document.getElementById('tamano-crecimiento').value;

    try {
        // Buscar si el animal existe por ID Interno o RFID en Firestore
        const vacasRef = collection(db, "vacas");
        const querySnapshot = await getDocs(
            query(vacasRef, where("idInterno", "==", idOerfid))
        );

        let vacaDoc;

        if (!querySnapshot.empty) {
            vacaDoc = querySnapshot.docs[0];
        } else {
            // Si no se encontró por ID Interno, buscar por RFID
            const querySnapshotByRFID = await getDocs(
                query(vacasRef, where("rfid", "==", idOerfid))
            );

            if (!querySnapshotByRFID.empty) {
                vacaDoc = querySnapshotByRFID.docs[0];
            } else {
                Swal.fire("Error", "No se encontró el animal con el ID o RFID proporcionado.", "error");
                return;
            }
        }

        const vacaData = vacaDoc.data();

        // Guardar el registro en Firestore
        const registro = {
            idInterno: vacaData.idInterno,
            peso: parseFloat(peso),
            tamano: parseFloat(tamano),
            fecha: new Date().toISOString(),
        };

        await addDoc(collection(db, "gestionCrecimiento"), registro);
        Swal.fire("Éxito", "Registro de crecimiento guardado correctamente.", "success");

        cerrarModal('modal-crecimiento');

        // Actualizar historial y gráficas
        await cargarHistorial();
        await cargarDatosGenerales();
    } catch (error) {
        Swal.fire("Error", "Ocurrió un error al guardar el registro de crecimiento.", "error");
    }
});


// Manejar el formulario de gestionar salida
document.getElementById('form-salida').addEventListener('submit', async (e) => {
    e.preventDefault();
    const idOerfid = document.getElementById('id-interno-salida').value;
    const pesoSalida = document.getElementById('peso-salida').value;
    const fechaSalida = document.getElementById('fecha-salida').value;
    const horaSalida = document.getElementById('hora-salida').value;

    try {
        // Buscar si el animal existe por ID Interno o RFID en Firestore
        const vacasRef = collection(db, "vacas");
        const querySnapshot = await getDocs(
            query(vacasRef, where("idInterno", "==", idOerfid))
        );

        let vacaDoc;

        if (!querySnapshot.empty) {
            vacaDoc = querySnapshot.docs[0];
        } else {
            // Si no se encontró por ID Interno, buscar por RFID
            const querySnapshotByRFID = await getDocs(
                query(vacasRef, where("rfid", "==", idOerfid))
            );

            if (!querySnapshotByRFID.empty) {
                vacaDoc = querySnapshotByRFID.docs[0];
            } else {
                Swal.fire("Error", "No se encontró el animal con el ID o RFID proporcionado.", "error");
                return;
            }
        }

        const vacaData = vacaDoc.data();

        // Guardar el registro de salida en Firestore
        const registro = {
            idInterno: vacaData.idInterno,
            pesoSalida: parseFloat(pesoSalida),
            fechaSalida: fechaSalida,
            horaSalida: horaSalida,
        };

        await addDoc(collection(db, "gestionSalidas"), registro);

        // Actualizar el estado de la vaca a "vendida"
        const vacaRef = doc(db, "vacas", vacaDoc.id);
        await setDoc(vacaRef, { estado: "vendida" }, { merge: true });

        Swal.fire("Éxito", "Salida registrada correctamente y estado actualizado a 'vendida'.", "success");

        cerrarModal('modal-salida');

        // Actualizar historial y gráficas
        await cargarHistorial();
        await cargarDatosGenerales();
        await cargarDatosGraficaSalidas();
    } catch (error) {
        console.error("Error al gestionar la salida:", error);
        Swal.fire("Error", "Ocurrió un error al gestionar la salida.", "error");
    }
});


// Define la función cerrarModal en el objeto global window
window.cerrarModal = function(modalId) {
    const modal = document.getElementById(modalId);

    if (modal) {
        // Oculta el modal al eliminar la clase 'show' y agregar 'hidden'
        modal.classList.remove('show');
        modal.classList.add('hidden');
        console.log(`Se cerró el modal con ID: ${modalId}`);

        // Limpia todos los campos de entrada, textarea y select dentro del modal
        const inputs = modal.querySelectorAll('input, textarea, select');
        inputs.forEach((input) => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false; // Desmarca checkboxes y radios
            } else {
                input.value = ''; // Limpia valores de texto, número, fecha, etc.
            }
        });

        console.log('Se limpiaron los campos del modal.');
    } else {
        console.warn(`Modal con ID ${modalId} no encontrado.`);
    }
};


async function cargarHistorial() {
    console.log("Iniciando la carga del historial...");
    const tablaHistorial = document.getElementById('historial-table');
    tablaHistorial.innerHTML = ''; // Limpiar tabla antes de cargar nuevos datos
    console.log("Tabla limpiada.");

    try {
        const cambios = [];

        // Obtener datos de la colección "gestionCrecimiento"
        console.log("Consultando datos de la colección 'gestionCrecimiento'...");
        const crecimientoSnapshot = await getDocs(query(collection(db, 'gestionCrecimiento'), orderBy('fecha', 'desc'), limit(10)));
        console.log(`Documentos obtenidos de 'gestionCrecimiento': ${crecimientoSnapshot.size}`);

        for (const doc of crecimientoSnapshot.docs) {
            const data = doc.data();
            console.log("Documento de crecimiento:", data);

            // Obtener RFID del animal a partir del ID Interno
            const vacasRef = collection(db, 'vacas');
            const vacaSnapshot = await getDocs(query(vacasRef, where("idInterno", "==", data.idInterno)));
            let rfid = 'N/A';
            if (!vacaSnapshot.empty) {
                const vacaData = vacaSnapshot.docs[0].data();
                rfid = vacaData.rfid || 'N/A';
            }

            cambios.push({
                fecha: new Date(data.fecha).toLocaleDateString(),
                hora: new Date(data.fecha).toLocaleTimeString(),
                animal: `ID: ${data.idInterno || 'N/A'} / RFID: ${rfid}`,
                cambio: 'Crecimiento',
                detalles: `Peso: ${data.peso} kg, Tamaño: ${data.tamano || 'N/A'} cm`
            });
        }

        // Obtener datos de la colección "gestionSalidas"
        console.log("Consultando datos de la colección 'gestionSalidas'...");
        const salidaSnapshot = await getDocs(query(collection(db, 'gestionSalidas'), orderBy('fechaSalida', 'desc'), limit(10)));
        console.log(`Documentos obtenidos de 'gestionSalidas': ${salidaSnapshot.size}`);

        for (const doc of salidaSnapshot.docs) {
            const data = doc.data();
            console.log("Documento de salida:", data);

            // Obtener RFID del animal a partir del ID Interno
            const vacasRef = collection(db, 'vacas');
            const vacaSnapshot = await getDocs(query(vacasRef, where("idInterno", "==", data.idInterno)));
            let rfid = 'N/A';
            if (!vacaSnapshot.empty) {
                const vacaData = vacaSnapshot.docs[0].data();
                rfid = vacaData.rfid || 'N/A';
            }

            cambios.push({
                fecha: data.fechaSalida || 'N/A',
                hora: data.horaSalida || 'N/A',
                animal: `ID: ${data.idInterno || 'N/A'} / RFID: ${rfid}`,
                cambio: 'Salida',
                detalles: `Peso Salida: ${data.pesoSalida} kg`
            });
        }

        // Ordenar los cambios por fecha y hora
        console.log("Ordenando los cambios por fecha y hora...");
        cambios.sort((a, b) => new Date(`${a.fecha} ${a.hora}`) - new Date(`${b.fecha} ${b.hora}`));
        console.log("Cambios ordenados:", cambios);

        // Renderizar los datos en la tabla
        console.log("Renderizando datos en la tabla...");
        cambios.forEach((cambio) => {
            console.log("Renderizando fila:", cambio);
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
        console.log("Tabla renderizada correctamente.");
    } catch (error) {
        console.error('Error al cargar el historial de cambios:', error);
        Swal.fire('Error', 'No se pudo cargar el historial de cambios.', 'error');
    }
}


// Variables para las gráficas
let pesoChart, tamanoChart;

function inicializarGraficas() {
    const ctxPeso = document.getElementById('chart-peso').getContext('2d');
    const ctxTamano = document.getElementById('chart-tamano').getContext('2d');

    // Gráfica de Peso
    pesoChart = new Chart(ctxPeso, {
        type: 'line',
        data: {
            labels: [], // Etiquetas iniciales
            datasets: [
                {
                    label: 'Peso (kg)',
                    data: [], // Datos iniciales
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Fecha',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Peso (kg)',
                    },
                },
            },
        },
    });

    // Gráfica de Tamaño
    tamanoChart = new Chart(ctxTamano, {
        type: 'line',
        data: {
            labels: [], // Etiquetas iniciales
            datasets: [
                {
                    label: 'Tamaño (cm)',
                    data: [], // Datos iniciales
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    borderWidth: 2,
                    tension: 0.4,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Fecha',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Tamaño (cm)',
                    },
                },
            },
        },
    });
}

// Llamar a la función para inicializar gráficas al cargar la página
window.onload = () => {
    inicializarGraficas();
};
function agruparDatosPorVaca(datos) {
    const agrupados = {};

    datos.forEach((dato) => {
        if (!agrupados[dato.idInterno]) {
            agrupados[dato.idInterno] = {
                etiquetas: [], // Fechas
                pesos: [], // Pesos
                tamanos: [], // Tamaños
            };
        }

        agrupados[dato.idInterno].etiquetas.push(dato.fecha.toLocaleDateString());
        agrupados[dato.idInterno].pesos.push(dato.peso);
        agrupados[dato.idInterno].tamanos.push(dato.tamano || null);
    });

    return agrupados;
}
function actualizarGraficasVariasLineas(crecimientoDatos) {
    console.log('Actualizando gráficas con varias líneas por vaca...');

    const datosAgrupados = agruparDatosPorVaca(crecimientoDatos);

    // Configurar líneas para la gráfica de Peso
    const pesoDatasets = Object.keys(datosAgrupados).map((idInterno, index) => {
        const color = `hsl(${(index * 360) / Object.keys(datosAgrupados).length}, 70%, 50%)`; // Colores únicos
        return {
            label: idInterno, // Nombre de la vaca
            data: datosAgrupados[idInterno].pesos,
            borderColor: color,
            backgroundColor: `${color}80`,
            borderWidth: 2,
            tension: 0.4,
        };
    });

    // Configurar líneas para la gráfica de Tamaño
    const tamanoDatasets = Object.keys(datosAgrupados).map((idInterno, index) => {
        const color = `hsl(${(index * 360) / Object.keys(datosAgrupados).length}, 70%, 50%)`; // Colores únicos
        return {
            label: idInterno, // Nombre de la vaca
            data: datosAgrupados[idInterno].tamanos,
            borderColor: color,
            backgroundColor: `${color}80`,
            borderWidth: 2,
            tension: 0.4,
        };
    });

    // Actualizar la gráfica de Peso
    pesoChart.data.labels = crecimientoDatos.map((dato) => dato.fecha.toLocaleDateString());
    pesoChart.data.datasets = pesoDatasets;
    pesoChart.update();

    // Actualizar la gráfica de Tamaño
    tamanoChart.data.labels = crecimientoDatos.map((dato) => dato.fecha.toLocaleDateString());
    tamanoChart.data.datasets = tamanoDatasets;
    tamanoChart.update();
}

async function cargarDatosGenerales() {
    console.log('Cargando datos de todas las vacas...');

    try {
        const crecimientoRef = collection(db, 'gestionCrecimiento');
        const crecimientoSnapshot = await getDocs(query(crecimientoRef, orderBy('fecha', 'asc')));

        const crecimientoDatos = [];

        // Procesar datos de crecimiento
        crecimientoSnapshot.forEach((doc) => {
            const data = doc.data();
            crecimientoDatos.push({
                fecha: new Date(data.fecha),
                idInterno: data.idInterno,
                peso: data.peso,
                tamano: data.tamano || null,
            });
        });

        console.log('Datos de crecimiento obtenidos:', crecimientoDatos);

        // Actualizar las gráficas
        actualizarGraficasVariasLineas(crecimientoDatos);
    } catch (error) {
        console.error('Error al cargar datos generales:', error);
        Swal.fire('Error', 'No se pudieron cargar los datos generales.', 'error');
    }
}


function actualizarGraficasGenerales(crecimientoDatos, salidaDatos) {
    console.log('Actualizando gráficas con datos generales...');

    // Agrupar datos por fecha
    const fechasCrecimiento = crecimientoDatos.map((dato) => dato.fecha.toLocaleDateString());
    const pesosCrecimiento = crecimientoDatos.map((dato) => dato.peso);
    const tamanosCrecimiento = crecimientoDatos.map((dato) => dato.tamano);

    const fechasSalida = salidaDatos.map((dato) => dato.fecha.toLocaleDateString());
    const pesosSalida = salidaDatos.map((dato) => dato.pesoSalida);

    // Actualizar gráfica de Peso
    pesoChart.data.labels = fechasCrecimiento;
    pesoChart.data.datasets[0].data = pesosCrecimiento;
    pesoChart.update();

    // Actualizar gráfica de Tamaño
    tamanoChart.data.labels = fechasCrecimiento;
    tamanoChart.data.datasets[0].data = tamanosCrecimiento;
    tamanoChart.update();
}

document.addEventListener('DOMContentLoaded', () => {
    cargarDatosGenerales(); // Cargar datos al iniciar
});

// Inicializa la gráfica de salidas
let chartSalidas;

async function inicializarGraficaSalidas() {
    const ctxSalidas = document.getElementById('chart-salidas').getContext('2d');

    chartSalidas = new Chart(ctxSalidas, {
        type: 'bar',
        data: {
            labels: [], // Meses dinámicos
            datasets: [
                {
                    label: 'Cantidad de Vacas',
                    data: [], // Datos dinámicos para la cantidad
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Mes',
                    },
                },
                y: {
                    title: {
                        display: true,
                        text: 'Cantidad de Vacas',
                    },
                    beginAtZero: true,
                },
            },
        },
    });
}

async function cargarDatosGraficaSalidas() {
    try {
        const salidasRef = collection(db, 'gestionSalidas');

        // Calcular la fecha de hace 6 meses
        const fechaActual = new Date();
        const fechaInicio = new Date();
        fechaInicio.setMonth(fechaInicio.getMonth() - 6);

        // Filtrar registros entre los últimos 6 meses
        const salidasSnapshot = await getDocs(
            query(
                salidasRef,
                where('fechaSalida', '>=', fechaInicio.toISOString()),
                orderBy('fechaSalida')
            )
        );

        const datosMensuales = {};

        // Procesar datos
        salidasSnapshot.forEach((doc) => {
            const data = doc.data();
            const fecha = new Date(data.fechaSalida);
            const mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

            if (!datosMensuales[mes]) {
                datosMensuales[mes] = 0; // Inicializar cantidad
            }

            datosMensuales[mes] += 1; // Incrementar cantidad por cada registro
        });

        // Preparar datos para la gráfica
        const meses = Object.keys(datosMensuales).sort();
        const cantidades = meses.map((mes) => datosMensuales[mes]);

        // Actualizar gráfica
        chartSalidas.data.labels = meses;
        chartSalidas.data.datasets[0].data = cantidades; // Cantidad de vacas
        chartSalidas.update();
    } catch (error) {
        console.error('Error al cargar los datos de la gráfica de salidas:', error);
        Swal.fire('Error', 'No se pudo cargar la gráfica de salidas.', 'error');
    }
}

// Inicializar gráfica y cargar datos al cargar la página
document.addEventListener('DOMContentLoaded', async () => {
    await inicializarGraficaSalidas();
    await cargarDatosGraficaSalidas();
});

function configurarFiltrosTabla() {
    const filterInputs = document.querySelectorAll('.filter-input');
    const tablaHistorial = document.getElementById('historial-table');

    filterInputs.forEach((input) => {
        input.addEventListener('input', () => {
            const filterFecha = document.getElementById('filter-fecha').value.toLowerCase().trim();
            const filterAnimal = document.getElementById('filter-animal').value.toLowerCase().trim();
            const filterCambio = document.getElementById('filter-cambio').value.toLowerCase().trim();

            const filas = tablaHistorial.querySelectorAll('tr');

            filas.forEach((fila) => {
                const columnas = fila.querySelectorAll('td');
                const fecha = columnas[0]?.textContent.toLowerCase();
                const animal = columnas[2]?.textContent.toLowerCase();
                const cambio = columnas[3]?.textContent.toLowerCase();

                const coincideFecha = !filterFecha || fecha.includes(filterFecha);
                const coincideAnimal = !filterAnimal || animal.includes(filterAnimal);
                const coincideCambio = !filterCambio || cambio.includes(filterCambio);

                if (coincideFecha && coincideAnimal && coincideCambio) {
                    fila.style.display = ''; // Mostrar la fila si coincide
                } else {
                    fila.style.display = 'none'; // Ocultar la fila si no coincide
                }
            });
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarHistorial().then(() => {
        configurarFiltrosTabla();
    });
});


document.addEventListener("DOMContentLoaded", () => {
    let isAuthChecked = false; // Variable para saber si el estado de autenticación ha sido verificado

   // Verifica el estado de autenticación
   onAuthStateChanged(auth, async (user) => {
       isAuthChecked = true;

       
       const userInfo = document.querySelector(".user-info span");
       const profileIcon = document.getElementById("profile-icon");
       const logoutBtn = document.getElementById("logout-btn");
       const perfilbtn = document.getElementById("perfil-btn");
       const iniciobtn = document.getElementById("btn-inicio");
       const content = document.getElementById("content"); // Área de contenido principal

       if (user) {
           const idTokenResult = await user.getIdTokenResult();
           const isAdmin = idTokenResult.claims.admin || false;

           if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
           iniciobtn.classList.add("hidden");
           logoutBtn.classList.remove("hidden");
           perfilbtn.classList.remove("hidden");

           // Si el usuario es administrador
           if (isAdmin) {
               console.log("Usuario con rol de administrador detectado.");
               const adminPanelBtn = document.getElementById("btn-panel");
               if (adminPanelBtn) adminPanelBtn.classList.remove("hidden");
                if(iniciobtn) iniciobtn.classList.add("hidden");

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
           iniciobtn.classList.add("hidden");
           

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