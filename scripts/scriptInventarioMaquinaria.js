import {
    initializeApp
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import {
    getAuth,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    deleteDoc,
    setDoc,
    getDoc,
    query,
    where
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
const db = getFirestore(app);
const auth = getAuth(app);
let currentUserProfile = null;

// === LÓGICA DE AUTENTICACIÓN Y PERFIL DE USUARIO ===
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
                isAdmin: userData.role === 'admin' // Derivamos isAdmin del rol
            };
        } else {
            // Si no hay perfil, es un usuario nuevo o un error.
            // Lo tratamos como individual sin permisos especiales.
            currentUserProfile = { uid: user.uid, email: user.email, role: 'individual', groupName: null, isAdmin: false };
        }
        loadInitialData(); // Cargar todos los datos una vez que el perfil está listo
    } else {
        currentUserProfile = null;
        // Limpiar tablas si el usuario cierra sesión
        document.querySelector('#equipment-table tbody').innerHTML = '<tr><td colspan="5">Inicie sesión para ver los datos.</td></tr>';
        document.querySelector('#maintenance-table tbody').innerHTML = '<tr><td colspan="7">Inicie sesión para ver los datos.</td></tr>';
    }
});

function loadInitialData() {
    loadEquipment();
    loadWorkOrders();
}

// === FUNCIONES GLOBALES PARA MODALES ===
window.openModal = (modalId) => {
    document.getElementById(modalId).classList.add('active');
    document.getElementById('overlay').classList.add('active');
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.remove('active');
    document.getElementById('overlay').classList.remove('active');
};

// === MANEJO DE FORMULARIOS Y DATOS ===
document.addEventListener('DOMContentLoaded', () => {
    // === Apertura de Modales ===
    document.getElementById('add-equipment-btn').addEventListener('click', () => openModal('modal-add-equipment'));
    document.getElementById('add-maintenance-btn').addEventListener('click', () => {
        loadEquipmentOptions('maintenance-equipment');
        openModal('modal-add-maintenance');
    });
    document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => closeModal(btn.closest('.modal').id)));
    document.getElementById('overlay').addEventListener('click', () => document.querySelectorAll('.modal.active').forEach(m => closeModal(m.id)));

    // === Envío de Formularios ===
    const addEquipmentForm = document.getElementById('add-equipment-form');
    addEquipmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserProfile) return Swal.fire('Error', 'Debe iniciar sesión', 'error');
        
        const formData = {
            name: addEquipmentForm['equipment-name'].value,
            description: addEquipmentForm['equipment-description'].value,
            purchaseDate: addEquipmentForm['equipment-purchase-date'].value,
            status: addEquipmentForm['equipment-status'].value,
            createdBy: currentUserProfile.uid,
            groupName: currentUserProfile.groupName || null
        };
        
        try {
            await addDoc(collection(db, 'maquinaria'), formData);
            Swal.fire('Éxito', 'Equipo agregado', 'success');
            closeModal('modal-add-equipment');
            addEquipmentForm.reset();
            loadEquipment();
        } catch (error) {
            console.error("Error adding document: ", error);
            Swal.fire('Error', `No se pudo agregar el equipo: ${error.message}`, 'error');
        }
    });

    const addWorkOrderForm = document.getElementById('add-maintenance-form');
    addWorkOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUserProfile) return Swal.fire('Error', 'Debe iniciar sesión', 'error');

        const formData = {
            equipment: addWorkOrderForm['maintenance-equipment'].value,
            type: addWorkOrderForm['maintenance-type'].value,
            date: addWorkOrderForm['maintenance-date'].value,
            description: addWorkOrderForm['maintenance-description'].value,
            responsible: addWorkOrderForm['maintenance-responsible'].value,
            status: addWorkOrderForm['maintenance-status'].value,
            createdBy: currentUserProfile.uid,
            groupName: currentUserProfile.groupName || null
        };

        try {
            await addDoc(collection(db, 'ordenes_trabajo'), formData);
            Swal.fire('Éxito', 'Orden de trabajo agregada', 'success');
            closeModal('modal-add-maintenance');
            addWorkOrderForm.reset();
            loadWorkOrders();
        } catch (error) {
            console.error("Error adding document: ", error);
            Swal.fire('Error', `No se pudo agregar la orden: ${error.message}`, 'error');
        }
    });

});

// === NUEVA LÓGICA DE CARGA DE DATOS ===

async function loadEquipment() {
    const tableBody = document.querySelector('#equipment-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';

    if (!currentUserProfile) {
        tableBody.innerHTML = `<tr><td colspan="5">Inicie sesión para ver los datos.</td></tr>`;
        return;
    }

    try {
        const maquinariaRef = collection(db, 'maquinaria');
        let queries = [];

        if (currentUserProfile.isAdmin) {
            // Admin get all documents
            queries.push(getDocs(query(maquinariaRef)));
        } else {
            // Non-admin queries
            queries.push(getDocs(query(maquinariaRef, where("createdBy", "==", currentUserProfile.uid))));
            if (currentUserProfile.groupName) {
                queries.push(getDocs(query(maquinariaRef, where("groupName", "==", currentUserProfile.groupName))));
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

        tableBody.innerHTML = ''; // Clear loading/previous state
        if (uniqueDocs.size === 0) {
            tableBody.innerHTML = `<tr><td colspan="5">No se encontraron datos de maquinaria.</td></tr>`;
            return;
        }

        uniqueDocs.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.name || ''}</td>
                <td>${data.description || ''}</td>
                <td>${data.purchaseDate || ''}</td>
                <td>${data.status || ''}</td>
                <td class="actions">
                    <button class="btn-edit" onclick="window.openEditEquipmentModal('${data.id}')">Editar</button>
                    <button class="btn-delete" onclick="window.deleteEquipment('${data.id}')">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading equipment:", error);
        tableBody.innerHTML = `<tr><td colspan="5">Error al cargar los datos. Verifique los permisos.</td></tr>`;
    }
}

async function loadWorkOrders() {
    const tableBody = document.querySelector('#maintenance-table tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

    if (!currentUserProfile) {
        tableBody.innerHTML = `<tr><td colspan="7">Inicie sesión para ver los datos.</td></tr>`;
        return;
    }

    try {
        const workOrdersRef = collection(db, 'ordenes_trabajo');
        let queries = [];

        if (currentUserProfile.isAdmin) {
            queries.push(getDocs(query(workOrdersRef)));
        } else {
            queries.push(getDocs(query(workOrdersRef, where("createdBy", "==", currentUserProfile.uid))));
            if (currentUserProfile.groupName) {
                queries.push(getDocs(query(workOrdersRef, where("groupName", "==", currentUserProfile.groupName))));
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

        tableBody.innerHTML = '';
        if (uniqueDocs.size === 0) {
            tableBody.innerHTML = `<tr><td colspan="7">No se encontraron órdenes de trabajo.</td></tr>`;
            return;
        }

        uniqueDocs.forEach(data => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${data.equipment || ''}</td>
                <td>${data.type || ''}</td>
                <td>${data.date || ''}</td>
                <td>${data.description || ''}</td>
                <td>${data.responsible || ''}</td>
                <td>${data.status || ''}</td>
                <td class="actions">
                    <button class="btn-edit" onclick="window.openEditWorkOrderModal('${data.id}')">Editar</button>
                    <button class="btn-delete" onclick="window.deleteWorkOrder('${data.id}')">Eliminar</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading work orders:", error);
        tableBody.innerHTML = `<tr><td colspan="7">Error al cargar los datos. Verifique los permisos.</td></tr>`;
    }
}

async function loadEquipmentOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">Cargando equipo...</option>';

    if (!currentUserProfile) {
        select.innerHTML = '<option value="">Inicie sesión</option>';
        return;
    }

    try {
        const maquinariaRef = collection(db, 'maquinaria');
        let queries = [];

        if (currentUserProfile.isAdmin) {
            queries.push(getDocs(query(maquinariaRef)));
        } else {
            queries.push(getDocs(query(maquinariaRef, where("createdBy", "==", currentUserProfile.uid))));
            if (currentUserProfile.groupName) {
                queries.push(getDocs(query(maquinariaRef, where("groupName", "==", currentUserProfile.groupName))));
            }
        }

        const querySnapshots = await Promise.all(queries);
        const uniqueDocs = new Map();

        querySnapshots.forEach(snapshot => {
            snapshot.forEach(doc => {
                if (!uniqueDocs.has(doc.id)) {
                    uniqueDocs.set(doc.id, doc.data());
                }
            });
        });
        
        select.innerHTML = '<option value="">Seleccione un equipo</option>';
        if (uniqueDocs.size > 0) {
            uniqueDocs.forEach(data => {
                const option = document.createElement('option');
                option.value = data.name;
                option.textContent = data.name;
                select.appendChild(option);
            });
        }

        select.value = currentValue; // Restore previous value if any

    } catch (error) {
        console.error("Error loading equipment options:", error);
        select.innerHTML = '<option value="">Error al cargar</option>';
    }
}


// === ACCIONES (EDITAR/ELIMINAR) CON VERIFICACIÓN DE PERMISOS ===
// NOTA: Las reglas de seguridad de Firestore ya protegen contra escrituras no autorizadas.
// El código del cliente asume que si un usuario puede ver un documento, tiene permiso para las acciones que se muestran.

window.openEditEquipmentModal = async (id) => {
    // Aquí podrías agregar lógica para poblar un modal de edición
    // Por simplicidad, este ejemplo no incluye un modal de edición completo.
    console.log("Abriendo modal de edición para:", id);
    Swal.fire('Función no implementada', 'La edición de equipo aún no está conectada en esta interfaz.', 'info');
    // Ejemplo de cómo se haría:
    /*
    const docRef = doc(db, 'maquinaria', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Poblar el formulario de edición
        openModal('modal-edit-equipment');
    }
    */
};

window.deleteEquipment = async (id) => {
    const result = await Swal.fire({
        title: '¿Está seguro?',
        text: "No podrá revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'maquinaria', id));
            Swal.fire('Eliminado', 'El equipo ha sido eliminado.', 'success');
            loadEquipment(); // Recargar la tabla
        } catch (error) {
            console.error("Error deleting document: ", error);
            Swal.fire('Error', `No se pudo eliminar: ${error.message}`,'error');
        }
    }
};

window.openEditWorkOrderModal = async (id) => {
    console.log("Abriendo modal de edición para orden:", id);
    Swal.fire('Función no implementada', 'La edición de órdenes de trabajo aún no está conectada en esta interfaz.', 'info');
};

window.deleteWorkOrder = async (id) => {
     const result = await Swal.fire({
        title: '¿Está seguro?',
        text: "No podrá revertir esta acción",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar!',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
         try {
            await deleteDoc(doc(db, 'ordenes_trabajo', id));
            Swal.fire('Eliminada', 'La orden de trabajo ha sido eliminada.', 'success');
            loadWorkOrders(); // Recargar la tabla
        } catch (error) {
            console.error("Error deleting document: ", error);
            Swal.fire('Error', `No se pudo eliminar: ${error.message}`,'error');
        }
    }
};
