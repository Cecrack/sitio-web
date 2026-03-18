import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { 
    getFirestore, 
    collection, 
    getDocs, 
    addDoc, 
    serverTimestamp,
    doc, 
    getDoc,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';

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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserProfile = null;

document.addEventListener("DOMContentLoaded", () => {
    const maquinaSelect = document.getElementById('maquina-select');
    const solicitudForm = document.getElementById('solicitud-form');
    const solicitanteEmailInput = document.getElementById('solicitante-email');
    const formMessage = document.getElementById('form-message');

    // 1. Rellenar el email del usuario y cargar datos según su perfil
    onAuthStateChanged(auth, async (user) => {
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
                // Perfil por defecto si no hay documento en Firestore
                currentUserProfile = { uid: user.uid, email: user.email, role: 'individual', groupName: null, isAdmin: false };
            }
            
            solicitanteEmailInput.value = user.email;
            solicitudForm.style.display = 'block';
            cargarMaquinaria(); // Cargar maquinaria después de tener el perfil

        } else {
            currentUserProfile = null;
            solicitanteEmailInput.value = 'Por favor, inicia sesión para identificarte.';
            solicitudForm.style.display = 'none'; // Ocultar formulario si no hay sesión
            maquinaSelect.innerHTML = '<option value="">Inicia sesión para ver los equipos</option>';
        }
    });

    // 2. Cargar la lista de maquinaria según el perfil del usuario
    async function cargarMaquinaria() {
        if (!currentUserProfile) return;

        try {
            let q = collection(db, 'maquinaria');

            // Aplicar filtros según el rol del usuario
            if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
                q = query(q, where("groupName", "==", currentUserProfile.groupName));
            } else if (!currentUserProfile.isAdmin) {
                q = query(q, where("createdBy", "==", currentUserProfile.uid));
            }
            // El admin obtiene todos los documentos (sin "where" clause)

            const querySnapshot = await getDocs(q);
            maquinaSelect.innerHTML = '<option value="">Selecciona un equipo</option>'; // Limpiar

            if (querySnapshot.empty) {
                maquinaSelect.innerHTML = '<option value="">No hay equipos para tu perfil</option>';
                return;
            }
            querySnapshot.forEach(doc => {
                const maquina = doc.data();
                const option = document.createElement('option');
                option.value = doc.id; // Guardamos el ID del documento
                option.textContent = `${maquina.name} (${maquina.marca} - ${maquina.modelo})`;
                maquinaSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error al cargar la maquinaria: ", error);
            maquinaSelect.innerHTML = '<option value="">Error al cargar equipos</option>';
        }
    }

    // 3. Gestionar el envío del formulario con el contexto del usuario
    solicitudForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentUserProfile) {
            formMessage.textContent = 'Error: Debes iniciar sesión para poder enviar una solicitud.';
            formMessage.className = 'message-error';
            return;
        }

        const maquinaId = maquinaSelect.value;
        const descripcion = document.getElementById('problema-descripcion').value;

        if (!maquinaId || !descripcion) {
            formMessage.textContent = 'Por favor, completa todos los campos del formulario.';
            formMessage.className = 'message-error';
            return;
        }

        try {
            // Añadir el documento con el contexto del usuario (uid y groupName)
            await addDoc(collection(db, 'solicitudesMantenimiento'), {
                maquinaId: maquinaId,
                descripcion: descripcion,
                solicitanteEmail: currentUserProfile.email,
                createdBy: currentUserProfile.uid, // Guardamos el UID
                groupName: currentUserProfile.groupName, // Guardamos el nombre del grupo
                fecha: serverTimestamp(),
                estado: 'pendiente'
            });

            // Mensaje de éxito y limpieza
            formMessage.textContent = '¡Solicitud enviada con éxito! El administrador la revisará pronto.';
            formMessage.className = 'message-success';
            solicitudForm.reset();
            solicitanteEmailInput.value = currentUserProfile.email; // Restaurar el email
            cargarMaquinaria(); 

        } catch (error) {
            console.error("Error al enviar la solicitud: ", error);
            formMessage.textContent = 'Hubo un error al enviar la solicitud. Por favor, inténtalo de nuevo.';
            formMessage.className = 'message-error';
        }
    });
});
