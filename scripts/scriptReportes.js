import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFirestore, collection, addDoc,getDocs,query, where } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-storage.js';




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
// Initialize Functions Authentication
const functions = getFunctions(app);
// Variable para saber si el estado de autenticación ha sido verificado
let isAuthChecked = false; 



document.addEventListener("DOMContentLoaded", () => {
     let isAuthChecked = false; // Variable para saber si el estado de autenticación ha sido verificado

    // Verifica el estado de autenticación
    onAuthStateChanged(auth, async (user) => {
        isAuthChecked = true;

        const userInfo = document.querySelector(".user-info span");
        const profileIcon = document.getElementById("profile-icon");
        const loginBtn = document.getElementById("login-btn");
        const createUserBtn = document.getElementById("create-user-btn");
        const logoutBtn = document.getElementById("logout-btn");
        const inicbtn = document.getElementById("btn-inicio");
        const perfilbtn = document.getElementById("perfil-btn");
        const content = document.getElementById("content"); // Área de contenido principal

        if (user) {
            const idTokenResult = await user.getIdTokenResult();
            const isAdmin = idTokenResult.claims.admin || false;

            if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
            loginBtn.classList.add("hidden");
            createUserBtn.classList.add("hidden");
            inicbtn.classList.add("hidden");
            logoutBtn.classList.remove("hidden");
            perfilbtn.classList.remove("hidden");

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
            inicbtn.classList.remove("hidden");
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

// Referencia a la colección 'vacas' en Firestore
const vacasCollection = collection(db, 'vacas');

// Función para obtener datos de género y dibujar la gráfica
async function fetchGenderData() {
    try {
        // Obtener todos los datos de la colección 'vacas'
        const querySnapshot = await getDocs(vacasCollection);

        // Contadores para machos y hembras
        let maleCount = 0;
        let femaleCount = 0;

        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            if (vaca.sexo === 'Macho') {
                maleCount++;
            } else if (vaca.sexo === 'hembra') {
                femaleCount++;
            }
        });

        // Dibujar la gráfica con los datos
        drawGenderChart(maleCount, femaleCount);
    } catch (error) {
        console.error('Error al obtener los datos de género:', error);
    }
}

// Función para dibujar la gráfica con Chart.js
function drawGenderChart(maleCount, femaleCount) {
    const ctx = document.getElementById('gender-chart').getContext('2d');

    new Chart(ctx, {
        type: 'bar', // Tipo de gráfica
        data: {
            labels: ['Machos', 'Hembras'], // Etiquetas de las barras
            datasets: [{
                label: 'Cantidad',
                data: [maleCount, femaleCount], // Datos de las barras
                backgroundColor: [
                    'rgba(54, 162, 235, 0.6)', // Azul para Machos
                    'rgba(255, 99, 132, 0.6)',  // Rojo para Hembras
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)', // Borde azul
                    'rgba(255, 99, 132, 1)', // Borde rojo
                ],
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true // Comienza en cero
                }
            }
        }
    });
}


// Llama a la función después de llenar los corrales
document.addEventListener("DOMContentLoaded", async () => {
    const corralCount = await countVacasByUbicacion();

    if (corralCount) {
        fillCorrales(corralCount);
    }
});

async function countVacasByUbicacion() {
    try {
        // Crear un objeto contador para cada corral
        const corralCount = {
            'Corral A': 0,
            'Corral B': 0,
            'Corral C': 0,
        };

        // Obtener todos los documentos de la colección 'vacas'
        const querySnapshot = await getDocs(vacasCollection);

        // Contar la cantidad de vacas en cada corral
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const ubicacion = vaca.ubicacion; // Campo 'ubicacion' en Firestore
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
    // Iterar sobre cada corral y agregar las vacas
    Object.keys(corralCount).forEach(corralId => {
        const vacaCount = corralCount[corralId]; // Obtener el número de vacas en cada corral
        const corralElement = document.getElementById(corralId.toLowerCase().replace(' ', '-')); // Corral A -> corral-a

        // Verificar que el corral existe
        if (corralElement) {
            const vacasContainer = corralElement.querySelector('.vacas'); // Obtener el contenedor de vacas dentro del corral

            // Limpiar el contenedor antes de agregar nuevas vacas
            vacasContainer.innerHTML = '';

            // Agregar vacas al corral
            for (let i = 0; i < vacaCount; i++) {
                const vaca = document.createElement('div');
                vaca.classList.add('vaca'); // Agregar la clase 'vaca' para estilo
                // Aquí puedes agregar estilos o posiciones aleatorias si quieres
                vaca.style.top = `${Math.random() * 150}px`; // Random vertical position
                vaca.style.left = `${Math.random() * 200}px`; // Random horizontal position
                vacasContainer.appendChild(vaca); // Añadir la vaca al contenedor
            }
        }
    });
}

// Obtener todos los elementos de los corrales
const corralElements = document.querySelectorAll(".corral");

// Función principal para asociar eventos a los corrales
async function setupCorralEvents() {
    try {
        // Obtener las vacas agrupadas por ubicación desde Firestore
        const vacasByUbicacion = await getVacasByUbicacion();

        // Asociar evento a cada corral
        corralElements.forEach((corralElement) => {
            corralElement.addEventListener("click", () => {
                const corralId = corralElement.querySelector("h3").textContent; // Ejemplo: 'Corral A'
                const vacas = vacasByUbicacion[corralId] || []; // Vacas del corral o vacío si no hay

                // Mostrar el modal con las vacas del corral seleccionado
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

    // Configurar el título y los detalles del modal
    modalTitle.textContent = `Detalles del ${corralId}`;
    vacasDetails.innerHTML = ""; // Limpiar contenido previo

    if (vacas.length > 0) {
        vacas.forEach((vaca, index) => {
            const vacaDetail = document.createElement("div");
            vacaDetail.classList.add("vaca-detail");
            vacaDetail.innerHTML = `
                <img src="${vaca.fotoURL || '#'}" alt="Foto de la vaca">
                <p><strong>Vaca ${index + 1}:</strong></p>
                <p>ID: ${vaca.id}</p>
                <p>Peso: ${vaca.peso || 'N/A'} kg</p>
                <p>Estado de Salud: ${vaca.estadoSalud || 'N/A'}</p>
                <p>Fecha de Ingreso: ${vaca.fechaIngreso || 'N/A'}</p>
            `;
            vacasDetails.appendChild(vacaDetail);
        });
    } else {
        vacasDetails.innerHTML = "<p>No hay vacas en este corral.</p>";
    }

    // Mostrar el modal
    modal.classList.add("active");
    overlay.classList.add("active");
}


// Función para cerrar el modal
document.getElementById("close-modal").addEventListener("click", () => {
    const modal = document.getElementById("corral-modal");
    const overlay = document.getElementById("overlay");
    modal.classList.remove("active");
    overlay.classList.remove("active");
});

// Función para cerrar el modal si se hace clic fuera de él (en el overlay)
document.getElementById("overlay").addEventListener("click", () => {
    const modal = document.getElementById("corral-modal");
    const overlay = document.getElementById("overlay");
    modal.classList.remove("active");
    overlay.classList.remove("active");
});


// Función para obtener vacas agrupadas por ubicación desde Firestore
async function getVacasByUbicacion() {
    try {
        // Crear un objeto para almacenar las vacas agrupadas
        const vacasByUbicacion = {};

        // Obtener todos los documentos de la colección 'vacas'
        const querySnapshot = await getDocs(vacasCollection);

        // Agrupar las vacas por ubicación
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const ubicacion = vaca.ubicacion; // Campo 'ubicacion' en Firestore

            // Inicializar el arreglo de vacas en la ubicación si no existe
            if (ubicacion) {
                if (!vacasByUbicacion[ubicacion]) {
                    vacasByUbicacion[ubicacion] = [];
                }

                // Agregar la vaca al grupo de la ubicación correspondiente
                vacasByUbicacion[ubicacion].push({
                    id: doc.id,
                    ...vaca,
                });
            }
        });

        return vacasByUbicacion;
    } catch (error) {
        console.error("Error al obtener vacas por ubicación:", error);
        return {};
    }
}

// Llamar a la configuración de eventos al cargar la página
setupCorralEvents();


async function fetchHealthStatusData() {
    try {
        // Consultar la colección de vacas
        const vacasCollection = collection(db, "vacas"); // Asegúrate de tener la colección correcta
        const querySnapshot = await getDocs(vacasCollection);

        // Inicializar contadores para los estados de salud
        let buenos = 0;
        let regular = 0;
        let enfermo = 0;

        // Recorrer los documentos y contar los estados de salud
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const estadoSalud = vaca.estadoSalud; // Campo estadoSalud de la vaca

            // Contar según el estado de salud
            if (estadoSalud === "bueno") {
                buenos++;
            } else if (estadoSalud === "regular") {
                regular++;
            } else if (estadoSalud === "enfermo") {
                enfermo++;
            }
        });

        // Llamar a la función para crear el gráfico de pastel con los datos
        createHealthStatusChart(buenos, regular, enfermo);
    } catch (error) {
        console.error("Error al obtener los datos de salud:", error);
    }
}

// Llamar a la función para obtener los datos
fetchHealthStatusData();
// Función para crear la gráfica de pastel
function createHealthStatusChart(buenos, regular, enfermo) {
    const healthChartData = {
        labels: ['Buenos', 'Regular', 'Enfermo'],
        datasets: [{
            label: 'Estado de Salud',
            data: [buenos, regular, enfermo], // Los datos de los estados de salud
            backgroundColor: ['#36A2EB', '#FFCD56', '#FF6384'], // Colores del pastel
            hoverOffset: 4 // Efecto al pasar el mouse por encima
        }]
    };

    // Configuración del gráfico de pastel
    const config = {
        type: 'pie', // Tipo de gráfico
        data: healthChartData,
        options: {
            responsive: false, // Desactivar la opción responsive para respetar el tamaño del canvas
            plugins: {
                legend: {
                    position: 'top', // Posición de la leyenda
                },
                tooltip: {
                    callbacks: {
                        label: function (tooltipItem) {
                            const label = tooltipItem.label;
                            const value = tooltipItem.raw;
                            return `${label}: ${value} vacas`; // Personaliza el tooltip
                        }
                    }
                },
                // Plugin para agregar los valores dentro del gráfico de pastel
                datalabels: {
                    anchor: 'center', // Ancla los valores al centro de cada segmento
                    align: 'center',  // Alinea los valores al centro
                    formatter: (value, context) => {
                        return `${context.chart.data.labels[context.dataIndex]}: ${value}`; // Muestra el valor con la etiqueta
                    },
                    font: {
                        weight: 'bold',
                        size: 14, // Tamaño de la fuente
                    },
                    color: 'white', // Color del texto
                }
            }
        },
        plugins: [ChartDataLabels] // Registra el plugin
    };

    // Crear el gráfico en el canvas
    const healthStatusChart = new Chart(
        document.getElementById('health-status-chart'), // El canvas donde se dibuja el gráfico
        config
    );
}

async function fetchDataForLastSixMonths() {
    try {
        const vacasCollection = collection(db, "vacas"); // Nombre de tu colección
        const querySnapshot = await getDocs(vacasCollection);

        // Inicializar el contador para los 6 meses
        const monthsCount = [0, 0, 0, 0, 0, 0]; // Un array con 6 valores (uno para cada mes)

        // Obtener la fecha actual
        const currentDate = new Date();
        
        // Recorrer los documentos de las vacas
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const fechaIngreso = vaca.fechaIngreso; // Asegúrate de tener este campo en el documento
            
            // Convertir la fecha de ingreso a un objeto Date
            const ingresoDate = new Date(fechaIngreso);

            // Verificar si la fecha de ingreso es dentro de los últimos 6 meses
            const diffMonths = currentDate.getMonth() - ingresoDate.getMonth() + 
                (12 * (currentDate.getFullYear() - ingresoDate.getFullYear()));

            // Si la vaca fue ingresada dentro de los últimos 6 meses
            if (diffMonths >= 0 && diffMonths < 6) {
                // Sumar al contador correspondiente
                monthsCount[diffMonths]++;
            }
        });

        // Llamar a la función para crear la gráfica de barras
        createBarChart(monthsCount);
    } catch (error) {
        console.error("Error al obtener los datos de fechaIngreso:", error);
    }
}

// Llamar la función
fetchDataForLastSixMonths();
// Función para crear el gráfico de barras
function createBarChart(monthsCount) {
    const monthsLabels = ["Hace 1 mes", "Hace 2 meses", "Hace 3 meses", "Hace 4 meses", "Hace 5 meses", "Hace 6 meses"];
    
    const chartData = {
        labels: monthsLabels,
        datasets: [{
            label: 'Cantidad de vacas ingresadas',
            data: monthsCount,
            backgroundColor: '#36A2EB', // Color de las barras
            borderColor: '#1e90ff', // Color del borde de las barras
            borderWidth: 1
        }]
    };

    const config = {
        type: 'bar', // Tipo de gráfico (barras)
        data: chartData,
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true // Asegura que el eje Y empiece desde 0
                }
            },
            plugins: {
                legend: {
                    position: 'top', // Posición de la leyenda
                }
            }
        }
    };

    // Crear el gráfico en el canvas
    const barChart = new Chart(
        document.getElementById('bar-chart'), // El canvas donde se dibuja el gráfico
        config
    );
}



// Llamar a la función cuando la página se carga
document.addEventListener('DOMContentLoaded', function() {
    fetchGenderData();
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

            if (estado.toLowerCase() === "buen estado") {
                buenEstado++;
            } else if (estado.toLowerCase() === "regular") {
                regular++;
            } else if (estado.toLowerCase() === "enfermas") {
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

async function generarReporteConGraficasYCorral() {
    // Recupera los datos de la colección de vacas desde Firestore
    const vacasCollectionRef = collection(db, "vacas");
    const vacasSnapshot = await getDocs(vacasCollectionRef);
    const vacasData = vacasSnapshot.docs.map(doc => doc.data());

    // Crea una instancia de jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Obtener la fecha actual
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    // Título del reporte con la fecha actual
    doc.setFontSize(18);
    doc.text(`Reporte de Ganadería Inteligente del día ${formattedDate}`, 20, 20);

    // Generar la primera gráfica (por ejemplo, de género)
    await fetchGenderData();
    const genderCanvas = document.getElementById('gender-chart');
    const genderImage = genderCanvas.toDataURL("image/png");
    doc.addImage(genderImage, 'PNG', 20, 30, 170, 100);

    // Espaciado y nueva página si es necesario
    let currentY = 130;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Generar la segunda gráfica (estado de salud)
    await fetchHealthStatusData();
    const healthCanvas = document.getElementById('health-status-chart');
    const healthImage = healthCanvas.toDataURL("image/png");
    doc.addImage(healthImage, 'PNG', 20, currentY, 170, 100);

    currentY += 110;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Manejar los gráficos ocultos (hidden)
    const hiddenCharts = document.querySelectorAll('.hidden');
    hiddenCharts.forEach(chart => chart.classList.remove('hidden')); // Mostrar gráficos

    // Esperar un momento para que los gráficos se rendericen
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Tasa de recuperación
    const recoveryCanvas = document.getElementById('recuperacionChart');
    const recoveryImage = recoveryCanvas.toDataURL("image/png");
    doc.addImage(recoveryImage, 'PNG', 20, currentY, 170, 100);

    currentY += 110;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Eventos médicos por fecha
    const eventosFechaCanvas = document.getElementById('eventosFechaChart');
    const eventosFechaImage = eventosFechaCanvas.toDataURL("image/png");
    doc.addImage(eventosFechaImage, 'PNG', 20, currentY, 170, 100);

    currentY += 110;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Enfermedades recurrentes
    const enfermedadesCanvas = document.getElementById('enfermedadesChart');
    const enfermedadesImage = enfermedadesCanvas.toDataURL("image/png");
    doc.addImage(enfermedadesImage, 'PNG', 20, currentY, 170, 100);

    currentY += 110;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Estado de salud
    const estadoSaludCanvas = document.getElementById('estadoSaludChart');
    const estadoSaludImage = estadoSaludCanvas.toDataURL("image/png");
    doc.addImage(estadoSaludImage, 'PNG', 20, currentY, 170, 100);

    // Ocultar nuevamente los gráficos
    hiddenCharts.forEach(chart => chart.classList.add('hidden'));
    currentY += 110;
    if (currentY + 100 > doc.internal.pageSize.height) {
        doc.addPage();
        currentY = 20;
    }

    // Captura la sección del corral
    const corralSection = document.querySelector('.corral-chart-section');
    await html2canvas(corralSection).then(canvas => {
        const corralImage = canvas.toDataURL("image/png");
        doc.addImage(corralImage, 'PNG', 20, currentY, 170, 100);
    });


    // Guardar el PDF
    doc.save('reporte_ganaderia.pdf');
}

// Llamar a la función cuando se haga clic en el botón para generar el reporte
document.getElementById('generate-report-btn').addEventListener('click', generarReporteConGraficasYCorral);

