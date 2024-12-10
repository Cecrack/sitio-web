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
        const perfilbtn = document.getElementById("perfil-btn");
        const adminList = document.getElementById("admin-list"); // Área de administradores
        const content = document.getElementById("content"); // Área de contenido principal

        if (user) {
            const idTokenResult = await user.getIdTokenResult();
            const isAdmin = idTokenResult.claims.admin || false;

            if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
            loginBtn.classList.add("hidden");
            createUserBtn.classList.add("hidden");
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
        alert("Has cerrado sesión.");

        // Verificar si ya estás en index.html
        if (window.location.pathname.includes("index.html")) {
            window.location.reload(); // Recargar la página si ya estás en index.html
        } else {
            window.location.href = "../index.html"; // Redirigir si estás en otra página
        }
                });
             }
 });

// Referencia a la colección 'vacas' en Firestore
const vacasCollection = collection(db, 'vacas');

// Función para obtener y filtrar datos
async function fetchReports() {
    try {
        // Obtener valores de los filtros desde el DOM
        const fecha = document.getElementById('date-filter').value;
        const animalId = document.getElementById('animal-id-filter').value;

        // Construir consulta base
        let q = vacasCollection;

        // Aplicar filtros condicionales
        if (animalId) {
            q = query(vacasCollection, where('rfid', '==', animalId));
        }
        if (fecha) {
            q = query(q, where('ultimaRevision', '==', fecha));
        }

        // Ejecutar la consulta
        const querySnapshot = await getDocs(q);

        // Referencia al cuerpo de la tabla
        const tableBody = document.getElementById('report-table-body');
        tableBody.innerHTML = ''; // Limpiar la tabla

        // Iterar sobre los documentos y llenar la tabla
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.id}</td> <!-- Identificador único -->
                <td><img src="${vaca.fotoURL}" alt="Foto de la vaca" width="100" height="100"></td> <!-- Mostrar la imagen -->
                <td>${vaca.peso || 'N/A'}</td>
                <td>${vaca.estadoSalud || 'N/A'}</td>
                <td>${vaca.fechaIngreso || 'N/A'}</td>
                <td>${vaca.sexo || 'N/A'}</td>
            `;
            tableBody.appendChild(row);
        });

        console.log('Datos filtrados correctamente');

        // Llamar a la función de progreso del animal con el ID
        if (animalId) {
            fetchProgresoAnimal(animalId); // Aquí pasamos el `animalId` definido
        }
    } catch (error) {
        console.error('Error al filtrar los datos:', error);
    }
}


document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('btn-buscar').addEventListener('click', fetchReports);
});
// Función para mostrar el progreso con datos existentes
async function fetchProgresoAnimal(animalId) {
    try {
        // Verificar si se proporcionó un ID de animal
        if (!animalId) {
            console.error('No se proporcionó un ID de animal');
            limpiarTablaProgreso();
            return;
        }

        // Construir la consulta para obtener el documento de la vaca
        const q = query(vacasCollection, where('rfid', '==', animalId));
        const querySnapshot = await getDocs(q);

        // Referencia al cuerpo de la tabla de progreso
        const tableBody = document.getElementById('weight-table-body');
        tableBody.innerHTML = ''; // Limpiar la tabla antes de llenarla

        if (querySnapshot.empty) {
            console.warn('No se encontraron datos para el animal especificado');
            limpiarTablaProgreso(); // Limpiar la tabla si no hay datos
            return;
        }

        // Iterar sobre los documentos encontrados (aunque debería haber solo uno por `rfid`)
        querySnapshot.forEach((doc) => {
            const vaca = doc.data();

            // Crear una fila para mostrar la fecha de ingreso
            const ingresoRow = document.createElement('tr');
            ingresoRow.innerHTML = `
                <td>Fecha de Ingreso</td>
                <td>${vaca.fechaIngreso || 'N/A'}</td>
            `;
            tableBody.appendChild(ingresoRow);

            // Crear una fila para mostrar el peso actual
            const pesoRow = document.createElement('tr');
            pesoRow.innerHTML = `
                <td>Peso Actual</td>
                <td>${vaca.peso || 'N/A'}</td>
            `;
            tableBody.appendChild(pesoRow);

            console.log('Información del animal cargada correctamente');
        });
    } catch (error) {
        console.error('Error al cargar la información del animal:', error);
        limpiarTablaProgreso(); // Limpiar la tabla en caso de error
    }
}

// Función para limpiar la tabla de progreso
function limpiarTablaProgreso() {
    const tableBody = document.getElementById('weight-table-body');
    tableBody.innerHTML = ''; // Limpiar todas las filas de la tabla
}

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
            if (vaca.sexo === 'macho') {
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


document.addEventListener('DOMContentLoaded', async () => {
    // Primero contar las vacas por ubicación (corrales)
    const corralCount = await countVacasByUbicacion();

    // Asegurarse de que los datos estén disponibles
    if (corralCount) {
        // Llamar a la función para llenar los corrales con las vacas
        fillCorrales(corralCount);
    }
});


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
            }
        }
    }
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

document.addEventListener('DOMContentLoaded', async () => {
    await createUbicacionChart();
});



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




