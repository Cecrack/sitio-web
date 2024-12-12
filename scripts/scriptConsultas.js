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


client.on("error", (err) => {
    console.error("Error en la conexión MQTT:", err);
});

document.addEventListener("DOMContentLoaded", () => {

    // Escucha datos del lector RFID
    client.on("message", (topic, message) => {
        if (topic === "/topic/rfid") {
            const rfidValue = message.toString().trim();
            console.log("RFID recibido:", rfidValue);

            const rfidFilterInput = document.getElementById("filter-rfid");
            rfidFilterInput.value = rfidValue;

            filtrarTarjetas(); // Aplica el filtro
        }
    });
});


document.addEventListener("DOMContentLoaded", () => {
    const cardsContainer = document.getElementById("cards-container");
    const modal = document.getElementById("edit-vaca-modal");
    const overlay = document.getElementById("overlay");

    // Función para cargar las vacas como tarjetas
    async function loadVacas() {
    const vacasSnapshot = await getDocs(collection(db, "vacas"));
    cardsContainer.innerHTML = ""; // Limpiar contenedor de tarjetas

    vacasSnapshot.forEach((doc) => {
        const vaca = doc.data();
        const card = document.createElement("div");

        // Añadir una clase especial si el estado es "vendida"
        const cardClass = vaca.estado === "vendida" ? "card sold" : "card";

        card.classList.add(...cardClass.split(" ")); // Añadir clases dinámicas

        card.innerHTML = `
            <img src="${vaca.fotoURL}" alt="Foto de ${vaca.idInterno}">
            <div class="card-header">${vaca.idInterno}</div>
            <div class="card-content">
                <p><strong>RFID:</strong> ${vaca.rfid}</p>
                <p><strong>Raza:</strong> ${vaca.raza}</p>
                <p><strong>Sexo:</strong> ${vaca.sexo}</p>
                <p><strong>Estado de Salud:</strong> ${vaca.estadoSalud}</p>
                <p><strong>Estado Reproductivo:</strong> ${vaca.estadoReproductivo}</p>
                <p><strong>Peso:</strong> ${vaca.peso} kg</p>
                <p><strong>Ubicación:</strong> ${vaca.ubicacion}</p>
                <p><strong>Historial de Vacunación:</strong> ${vaca.historialVacunacion}</p>
                <p><strong>Último Parto:</strong> ${vaca.fechaUltimoParto}</p>
                <p><strong>Ingreso:</strong> ${vaca.fechaIngreso}</p>
                <p><strong>Desparasitación:</strong> ${vaca.fechaDesparasitacion}</p>
                <p><strong>Número de Crías:</strong> ${vaca.numeroCrias}</p>
                <p><strong>Observaciones:</strong> ${vaca.observaciones}</p>
                <p><strong>Estado:</strong> ${vaca.estado}</p>
            </div>
            <div class="card-actions">
                <button class="edit-btn" onclick="editVaca('${doc.id}')">Editar</button>
            </div>
        `;

        cardsContainer.appendChild(card);
    });
}

    loadVacas();
    // Función para editar los datos de una vaca
    window.editVaca = async (id) => {
        const vacaRef = doc(db, "vacas", id);
        const vacaDoc = await getDoc(vacaRef);

        if (vacaDoc.exists()) {
            const vaca = vacaDoc.data();

            // Rellenar los campos del formulario
            document.getElementById("edit-id-interno").value = vaca.idInterno || "";
            document.getElementById("edit-rfid").value = vaca.rfid || "";
            document.getElementById("edit-raza").value = vaca.raza || "";
            document.getElementById("edit-sexo").value = vaca.sexo || "";
            document.getElementById("edit-estado-salud").value = vaca.estadoSalud || "";
            document.getElementById("edit-estado-reproductivo").value = vaca.estadoReproductivo || "";
            document.getElementById("edit-peso").value = vaca.peso || "";
            document.getElementById("edit-ubicacion").value = vaca.ubicacion || "";
            document.getElementById("edit-historial-vacunacion").value = vaca.historialVacunacion || "";
            document.getElementById("edit-ultimo-parto").value = vaca.fechaUltimoParto || "";
            document.getElementById("edit-ingreso").value = vaca.fechaIngreso || "";
            document.getElementById("edit-desparasitacion").value = vaca.fechaDesparasitacion || "";
            document.getElementById("edit-numero-crias").value = vaca.numeroCrias || "";
            document.getElementById("edit-observaciones").value = vaca.observaciones || "";

            // Previsualizar la imagen actual
            const imgPreview = document.getElementById("edit-image-preview");
            imgPreview.src = vaca.fotoURL || "default-image.jpg";

            // Mostrar el modal
            modal.classList.add("active");
            overlay.classList.add("active");

            // Manejo del envío del formulario
            document.getElementById("edit-vaca-form").onsubmit = async (e) => {
                e.preventDefault();

                // Mantener la imagen actual si no se cambia
                const updatedFotoURL = vaca.fotoURL;

                await setDoc(vacaRef, {
                    idInterno: document.getElementById("edit-id-interno").value,
                    rfid: document.getElementById("edit-rfid").value,
                    raza: document.getElementById("edit-raza").value,
                    sexo: document.getElementById("edit-sexo").value,
                    estadoSalud: document.getElementById("edit-estado-salud").value,
                    estadoReproductivo: document.getElementById("edit-estado-reproductivo").value,
                    peso: document.getElementById("edit-peso").value,
                    ubicacion: document.getElementById("edit-ubicacion").value,
                    historialVacunacion: document.getElementById("edit-historial-vacunacion").value,
                    fechaUltimoParto: document.getElementById("edit-ultimo-parto").value,
                    fechaIngreso: document.getElementById("edit-ingreso").value,
                    fechaDesparasitacion: document.getElementById("edit-desparasitacion").value,
                    numeroCrias: document.getElementById("edit-numero-crias").value,
                    observaciones: document.getElementById("edit-observaciones").value,
                    fotoURL: updatedFotoURL, // Mantener la URL de la imagen
                });

                // Cerrar el modal
                modal.classList.remove("active");
                overlay.classList.remove("active");

                // Recargar las tarjetas
                loadVacas();
            };
        }
    };

    document.querySelector(".close-button").addEventListener("click", () => {
        modal.classList.remove("active");
        overlay.classList.remove("active");
        loadVacas(); // Aseguramos que se recarguen las tarjetas después de cerrar el modal
    });
});



// Función para filtra  r tarjetas de vacas
function filtrarTarjetas() {
    const rfidValue = document.getElementById("filter-rfid").value.toLowerCase().trim();
    const razaValue = document.getElementById("filter-raza").value.toLowerCase().trim();
    const estadoSaludValue = document.getElementById("filter-estado-salud").value.toLowerCase().trim();
    const ubicacionValue = document.getElementById("filter-ubicacion").value.toLowerCase().trim();
    
    const cards = document.querySelectorAll(".card"); // Selecciona todas las tarjetas

    cards.forEach((card) => {
        const identificadorInterno = card.querySelector(".card-header").textContent.toLowerCase();
        const rfid = card.querySelector(".card-content p:nth-child(1)").textContent.toLowerCase();
        const raza = card.querySelector(".card-content p:nth-child(2)").textContent.toLowerCase();
        const estadoSalud = card.querySelector(".card-content p:nth-child(4)").textContent.toLowerCase();
        const ubicacion = card.querySelector(".card-content p:nth-child(7)").textContent.toLowerCase();

        const matchesRfidOrIdInterno = 
            rfidValue === "" || 
            rfid.includes(rfidValue) || 
            identificadorInterno.includes(rfidValue); // Filtrar por RFID o Identificador Interno
        const matchesRaza = razaValue === "" || raza.includes(razaValue);
        const matchesEstadoSalud = estadoSaludValue === "" || estadoSalud.includes(estadoSaludValue);
        const matchesUbicacion = ubicacionValue === "" || ubicacion.includes(ubicacionValue);

        if (matchesRfidOrIdInterno && matchesRaza && matchesEstadoSalud && matchesUbicacion) {
            card.style.display = ""; // Mostrar tarjeta si coincide
        } else {
            card.style.display = "none"; // Ocultar tarjeta si no coincide
        }
    });
}

// Añadir eventos a los inputs de filtro
document.addEventListener("DOMContentLoaded", () => {
    
    const filterInputs = document.querySelectorAll(".filter-input");
    filterInputs.forEach((input) => {
        input.addEventListener("input", filtrarTarjetas);
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
       const content = document.getElementById("content"); // Área de contenido principal
       const inicbtn = document.getElementById("btn-inicio");

       if (user) {
           const idTokenResult = await user.getIdTokenResult();
           const isAdmin = idTokenResult.claims.admin || false;
           inicbtn.classList.add("hidden");

           if (userInfo) userInfo.textContent = `Bienvenido, ${user.email}`;
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
