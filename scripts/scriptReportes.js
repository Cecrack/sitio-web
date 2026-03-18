import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import {
    getFunctions
} from "https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js";

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
const functions = getFunctions(app);
let currentUserProfile = null;

// --- MANEJO DE AUTENTICACIÓN Y PERFIL DE USUARIO ---
onAuthStateChanged(auth, async (user) => {
    const userInfo = document.querySelector(".user-info span");
    const loginBtn = document.getElementById("login-btn");
    const createUserBtn = document.getElementById("create-user-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const perfilbtn = document.getElementById("perfil-btn");

    if (user) {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const idTokenResult = await user.getIdTokenResult();
            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'individual',
                groupName: userData.groupName || null,
                isAdmin: idTokenResult.claims.admin || false
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
        if(loginBtn) loginBtn.classList.add("hidden");
        if(createUserBtn) createUserBtn.classList.add("hidden");
        if(logoutBtn) logoutBtn.classList.remove("hidden");
        if(perfilbtn) perfilbtn.classList.remove("hidden");
        if (currentUserProfile.isAdmin) {
            const adminPanelBtn = document.getElementById("btn-panel");
            if (adminPanelBtn) adminPanelBtn.classList.remove("hidden");
        }
        
        // --- INICIALIZACIÓN DE FUNCIONES CON DATOS FILTRADOS ---
        initializeCharts();

    } else {
        currentUserProfile = null;
        if (userInfo) userInfo.textContent = "Iniciar sesión";
        if(loginBtn) loginBtn.classList.remove("hidden");
        if(createUserBtn) createUserBtn.classList.remove("hidden");
        if(logoutBtn) logoutBtn.classList.add("hidden");
        if(perfilbtn) perfilbtn.classList.add("hidden");
        initializeCharts(); // Limpia o muestra estado sin sesión
    }
});


function initializeCharts() {
    fetchMaintenanceDataAndDrawChart();
    document.getElementById('export-equipos-csv').addEventListener('click', handleExportEquipos);
    document.getElementById('export-ordenes-csv').addEventListener('click', handleExportOrdenes);
    fetchGenderData();
    countVacasByUbicacion().then(corralCount => {
        if (corralCount) fillCorrales(corralCount);
    });
    setupCorralEvents();
    fetchHealthStatusData();
    fetchDataForLastSixMonths();
    graficarEnfermedadesRecurrentes();
    graficarTasaRecuperacion();
    graficarEstadoDeSalud();
    graficarEventosPorFecha();
    document.getElementById('generate-report-btn').addEventListener('click', generarReporteConGraficasYCorral);
    const navToggle = document.getElementById('nav-toggle');
    const navMenu = document.getElementById('nav-menu');
    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('show');
        });
    }
}


// --- CONSTRUCCIÓN DE CONSULTAS DINÁMICAS ---
function getQueryForUserData(baseCollection) {
    if (!currentUserProfile) {
        return null; // No hay usuario, no hay consulta
    }
    if (currentUserProfile.isAdmin) {
        return query(baseCollection); // Admin ve todo
    } else if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
        return query(baseCollection, where("groupName", "==", currentUserProfile.groupName));
    } else {
        return query(baseCollection, where("createdBy", "==", currentUserProfile.uid));
    }
}


// === FUNCIONES PARA KPI DE MANTENIMIENTO Y CSV ===
async function fetchMaintenanceDataAndDrawChart() {
    const q = getQueryForUserData(collection(db, 'ordenes_trabajo'));
    if(!q) return;

    try {
        const querySnapshot = await getDocs(q);
        let correctivoCount = 0;
        let preventivoCount = 0;

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.type === 'Mantenimiento Correctivo') {
                correctivoCount++;
            } else if (data.type === 'Mantenimiento Preventivo') {
                preventivoCount++;
            }
        });

        const canvas = document.getElementById('maintenance-kpi-chart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Mantenimiento Correctivo', 'Mantenimiento Preventivo'],
                datasets: [{
                    label: 'Tipos de Órdenes de Trabajo',
                    data: [correctivoCount, preventivoCount],
                    backgroundColor: ['rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)'],
                    borderColor: ['rgba(255, 99, 132, 1)', 'rgba(54, 162, 235, 1)'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Comparativa de Órdenes de Trabajo'
                    }
                }
            }
        });
    } catch (error) {
        console.error("Error al obtener datos de mantenimiento: ", error);
    }
}

function exportToCsv(filename, rows) {
    if (!rows || rows.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
        keys.join(separator) +
        '\n' +
        rows.map(row => {
            return keys.map(k => {
                let cell = row[k] === null || row[k] === undefined ? '' : row[k];
                cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
                if (cell.search(/("|\n)/g) >= 0) {
                    cell = `"${cell}"`;
                }
                return cell;
            }).join(separator);
        }).join('\n');

    const blob = new Blob([csvContent], {
        type: 'text/csv;charset=utf-8;'
    });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleExportEquipos() {
    const q = getQueryForUserData(collection(db, 'maquinaria'));
    if(!q) return;
    try {
        const querySnapshot = await getDocs(q);
        const equipos = [];
        querySnapshot.forEach(doc => {
            equipos.push({
                id: doc.id,
                ...doc.data()
            });
        });
        exportToCsv('equipos.csv', equipos);
    } catch (error) {
        console.error("Error al exportar equipos: ", error);
        alert('Error al exportar equipos.');
    }
}

async function handleExportOrdenes() {
    const q = getQueryForUserData(collection(db, 'ordenes_trabajo'));
    if(!q) return;

    try {
        const querySnapshot = await getDocs(q);
        const ordenes = [];
        querySnapshot.forEach(doc => {
            ordenes.push({
                id: doc.id,
                ...doc.data()
            });
        });
        exportToCsv('ordenes_trabajo.csv', ordenes);
    } catch (error) {
        console.error("Error al exportar órdenes: ", error);
        alert('Error al exportar órdenes de trabajo.');
    }
}

// === FUNCIONES ORIGINALES DEL SCRIPT (AHORA FILTRADAS) ===

async function fetchGenderData() {
    const q = getQueryForUserData(collection(db, 'vacas'));
    if(!q) return;

    try {
        const querySnapshot = await getDocs(q);
        let maleCount = 0;
        let femaleCount = 0;
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            if (vaca.sexo === 'macho') {
                maleCount++;
            } else if (vaca.sexo === 'hembra') {
                femaleCount++;
            }
        });
        drawGenderChart(maleCount, femaleCount);
    } catch (error) {
        console.error('Error al obtener los datos de género:', error);
    }
}


function drawGenderChart(maleCount, femaleCount) {
    const canvas = document.getElementById('gender-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Machos', 'Hembras'],
            datasets: [{
                label: 'Cantidad',
                data: [maleCount, femaleCount],
                backgroundColor: ['rgba(54, 162, 235, 0.6)', 'rgba(255, 99, 132, 0.6)'],
                borderColor: ['rgba(54, 162, 235, 1)', 'rgba(255, 99, 132, 1)'],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

async function countVacasByUbicacion() {
    const q = getQueryForUserData(collection(db, 'vacas'));
    if(!q) return null;

    try {
        const corralCount = {
            'Corral A': 0,
            'Corral B': 0,
            'Corral C': 0
        };
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const ubicacion = vaca.ubicacion;
            if (ubicacion && corralCount.hasOwnProperty(ubicacion)) {
                corralCount[ubicacion]++;
            }
        });
        return corralCount;
    } catch (error) {
        console.error('Error al contar las vacas por ubicación:', error);
        return null;
    }
}

function fillCorrales(corralCount) {
    Object.keys(corralCount).forEach(corralId => {
        const vacaCount = corralCount[corralId];
        const corralElement = document.getElementById(corralId.toLowerCase().replace(' ', '-'));
        if (corralElement) {
            const vacasContainer = corralElement.querySelector('.vacas');
            vacasContainer.innerHTML = '';
            for (let i = 0; i < vacaCount; i++) {
                const vaca = document.createElement('div');
                vaca.classList.add('vaca');
                vaca.style.top = `${Math.random() * 150}px`;
                vaca.style.left = `${Math.random() * 200}px`;
                vacasContainer.appendChild(vaca);
            }
        }
    });
}

async function getVacasByUbicacion() {
    const q = getQueryForUserData(collection(db, 'vacas'));
    if(!q) return {};

    try {
        const vacasByUbicacion = {};
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const ubicacion = vaca.ubicacion;
            if (ubicacion) {
                if (!vacasByUbicacion[ubicacion]) {
                    vacasByUbicacion[ubicacion] = [];
                }
                vacasByUbicacion[ubicacion].push({
                    id: doc.id,
                    ...vaca
                });
            }
        });
        return vacasByUbicacion;
    } catch (error) {
        console.error("Error al obtener vacas por ubicación:", error);
        return {};
    }
}

async function setupCorralEvents() {
    try {
        const vacasByUbicacion = await getVacasByUbicacion();
        const corralElements = document.querySelectorAll(".corral");
        corralElements.forEach((corralElement) => {
            corralElement.addEventListener("click", () => {
                const corralId = corralElement.querySelector("h3").textContent;
                const vacas = vacasByUbicacion[corralId] || [];
                showModal(corralId, vacas);
            });
        });
    } catch (error) {
        console.error("Error al configurar eventos para los corrales:", error);
    }
}

function showModal(corralId, vacas) {
    const modal = document.getElementById("corral-modal");
    const overlay = document.getElementById("overlay");
    const modalTitle = document.getElementById("corral-title");
    const vacasDetails = document.getElementById("vacas-details");
    if (!modal || !overlay || !modalTitle || !vacasDetails) return;

    modalTitle.textContent = `Detalles del ${corralId}`;
    vacasDetails.innerHTML = "";
    if (vacas.length > 0) {
        vacas.forEach((vaca, index) => {
            const vacaDetail = document.createElement("div");
            vacaDetail.classList.add("vaca-detail");
            vacaDetail.innerHTML = `<img src="${vaca.fotoURL || '#'}" alt="Foto de la vaca"><p><strong>Vaca ${index + 1}:</strong></p><p>ID: ${vaca.id}</p><p>Peso: ${vaca.peso || 'N/A'} kg</p><p>Estado de Salud: ${vaca.estadoSalud || 'N/A'}</p><p>Fecha de Ingreso: ${vaca.fechaIngreso || 'N/A'}</p>`;
            vacasDetails.appendChild(vacaDetail);
        });
    } else {
        vacasDetails.innerHTML = "<p>No hay vacas en este corral.</p>";
    }
    modal.classList.add("active");
    overlay.classList.add("active");
}

const closeModalBtn = document.getElementById("close-modal");
if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
        const modal = document.getElementById("corral-modal");
        const overlay = document.getElementById("overlay");
        if (modal) modal.classList.remove("active");
        if (overlay) overlay.classList.remove("active");
    });
}

const overlay = document.getElementById("overlay");
if (overlay) {
    overlay.addEventListener("click", () => {
        const modal = document.getElementById("corral-modal");
        if (modal) modal.classList.remove("active");
        overlay.classList.remove("active");
    });
}


async function fetchHealthStatusData() {
    const q = getQueryForUserData(collection(db, "vacas"));
    if(!q) return;

    try {
        const querySnapshot = await getDocs(q);
        let buenos = 0,
            regular = 0,
            enfermo = 0;
        querySnapshot.forEach((doc) => {
            const estadoSalud = doc.data().estadoSalud;
            if (estadoSalud === "bueno") buenos++;
            else if (estadoSalud === "regular") regular++;
            else if (estadoSalud === "enfermo") enfermo++;
        });
        createHealthStatusChart(buenos, regular, enfermo);
    } catch (error) {
        console.error("Error al obtener los datos de salud:", error);
    }
}

function createHealthStatusChart(buenos, regular, enfermo) {
    const canvas = document.getElementById('health-status-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Buenos', 'Regular', 'Enfermo'],
            datasets: [{
                label: 'Estado de Salud',
                data: [buenos, regular, enfermo],
                backgroundColor: ['#36A2EB', '#FFCD56', '#FF6384'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: false,
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        },
    });
}

async function fetchDataForLastSixMonths() {
    const q = getQueryForUserData(collection(db, "vacas"));
    if(!q) return;

    try {
        const querySnapshot = await getDocs(q);
        const monthsCount = [0, 0, 0, 0, 0, 0];
        const currentDate = new Date();
        querySnapshot.forEach((doc) => {
            const ingresoDate = new Date(doc.data().fechaIngreso);
            const diffMonths = currentDate.getMonth() - ingresoDate.getMonth() + (12 * (currentDate.getFullYear() - ingresoDate.getFullYear()));
            if (diffMonths >= 0 && diffMonths < 6) {
                monthsCount[diffMonths]++;
            }
        });
        createBarChart(monthsCount);
    } catch (error) {
        console.error("Error al obtener los datos de fechaIngreso:", error);
    }
}

function createBarChart(monthsCount) {
    const canvas = document.getElementById('bar-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const monthsLabels = ["Hace 1 mes", "Hace 2 meses", "Hace 3 meses", "Hace 4 meses", "Hace 5 meses", "Hace 6 meses"];
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthsLabels,
            datasets: [{
                label: 'Cantidad de vacas ingresadas',
                data: monthsCount,
                backgroundColor: '#36A2EB',
                borderColor: '#1e90ff',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            }
        }
    });
}

async function graficarEnfermedadesRecurrentes() {
    const q = getQueryForUserData(collection(db, "historialMedico"));
    if(!q) return;
    const enfermedades = {};
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const evento = doc.data().evento || "Sin evento";
            if (evento in enfermedades) {
                enfermedades[evento]++;
            } else {
                enfermedades[evento] = 1;
            }
        });
        const canvas = document.getElementById("enfermedadesChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "pie",
            data: {
                labels: Object.keys(enfermedades),
                datasets: [{
                    label: "Porcentaje de Enfermedades Recurrentes",
                    data: Object.values(enfermedades),
                    backgroundColor: ["rgba(255, 99, 132, 0.6)", "rgba(54, 162, 235, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(75, 192, 192, 0.6)", "rgba(153, 102, 255, 0.6)", "rgba(255, 159, 64, 0.6)"]
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar enfermedades recurrentes:", error);
    }
}

async function graficarTasaRecuperacion() {
    const q = getQueryForUserData(collection(db, "historialMedico"));
    if(!q) return;

    let recuperadas = 0;
    let enTratamiento = 0;
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const evento = doc.data().evento || "";
            if (evento.toLowerCase().includes("recuperación")) {
                recuperadas++;
            } else if (evento.toLowerCase().includes("tratamiento")) {
                enTratamiento++;
            }
        });
        const canvas = document.getElementById("recuperacionChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
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

async function graficarEstadoDeSalud() {
    const q = getQueryForUserData(collection(db, "vacas"));
    if(!q) return;

    let buenEstado = 0,
        regular = 0,
        enfermas = 0;
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const estado = doc.data().estadoSalud || "Desconocido";
            if (estado.toLowerCase() === "buen estado") buenEstado++;
            else if (estado.toLowerCase() === "regular") regular++;
            else if (estado.toLowerCase() === "enfermas") enfermas++;
        });
        const canvas = document.getElementById("estadoSaludChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        new Chart(ctx, {
            type: "pie",
            data: {
                labels: ["Buen Estado", "Regular", "Enfermas"],
                datasets: [{
                    label: "Estado de Salud de las Vacas",
                    data: [buenEstado, regular, enfermas],
                    backgroundColor: ["rgba(75, 192, 192, 0.6)", "rgba(255, 206, 86, 0.6)", "rgba(255, 99, 132, 0.6)"]
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar estado de salud:", error);
    }
}

async function graficarEventosPorFecha() {
    const q = getQueryForUserData(collection(db, "historialMedico"));
    if(!q) return;

    const eventosPorMes = {};
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            const fecha = doc.data().fecha || "";
            const mes = fecha.split("-").slice(0, 2).join("-");
            if (mes in eventosPorMes) {
                eventosPorMes[mes]++;
            } else {
                eventosPorMes[mes] = 1;
            }
        });
        const sortedMeses = Object.keys(eventosPorMes).sort();
        const canvas = document.getElementById("eventosFechaChart");
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
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
                    tension: 0.3
                }]
            }
        });
    } catch (error) {
        console.error("Error al graficar eventos por fecha:", error);
    }
}

async function generarReporteConGraficasYCorral() {
    const {
        jsPDF
    } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const today = new Date();
    const formattedDate = `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;

    doc.setFontSize(18);
    doc.text(`Reporte de Ganadería Inteligente - ${formattedDate}`, 105, 20, {
        align: 'center'
    });

    let currentY = 30;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;

    const addChartToPdf = async (canvasId, title) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.log(`Canvas con ID '${canvasId}' no encontrado.`);
            return;
        }

        const chartHeight = 80; // Altura estimada del gráfico en el PDF
        if (currentY + chartHeight + margin > pageHeight) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14);
        doc.text(title, 105, currentY, {
            align: 'center'
        });
        currentY += 8;

        const image = canvas.toDataURL("image/png", 1.0);
        doc.addImage(image, 'PNG', 15, currentY, 180, chartHeight);
        currentY += chartHeight + 15;
    };

    const chartIds = [{
        id: 'maintenance-kpi-chart',
        title: 'Indicadores de Mantenimiento'
    }, {
        id: 'gender-chart',
        title: 'Distribución por Género'
    }, {
        id: 'health-status-chart',
        title: 'Estado de Salud de las Vacas'
    }, {
        id: 'recuperacionChart',
        title: 'Tasa de Recuperación de Enfermedades'
    }, {
        id: 'eventosFechaChart',
        title: 'Distribución de Eventos Médicos por Fecha'
    }, {
        id: 'enfermedadesChart',
        title: 'Porcentaje de Enfermedades Recurrentes'
    }, {
        id: 'estadoSaludChart',
        title: 'Porcentaje de Vacas por Estado de Salud'
    }, ];

    const hiddenCharts = document.querySelectorAll('.hidden');
    hiddenCharts.forEach(chart => chart.classList.remove('hidden'));
    await new Promise(resolve => setTimeout(resolve, 500)); // Espera a que se rendericen

    for (const chart of chartIds) {
        await addChartToPdf(chart.id, chart.title);
    }

    hiddenCharts.forEach(chart => chart.classList.add('hidden'));

    // Captura la sección del corral
    const corralSection = document.querySelector('.corral-chart-section');
    if (corralSection) {
        const sectionHeight = 80;
        if (currentY + sectionHeight + margin > pageHeight) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(14);
        doc.text('Distribución en Corrales', 105, currentY, {
            align: 'center'
        });
        currentY += 8;

        await html2canvas(corralSection).then(canvas => {
            const image = canvas.toDataURL("image/png", 1.0);
            doc.addImage(image, 'PNG', 15, currentY, 180, sectionHeight);
        });
    }

    doc.save(`reporte_ganaderia_${today.toISOString().split('T')[0]}.pdf`);
}
