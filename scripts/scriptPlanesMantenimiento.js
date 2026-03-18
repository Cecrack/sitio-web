import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, doc, getDoc, collection, addDoc, deleteDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-functions.js';

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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

let currentUserProfile = null;

document.addEventListener('DOMContentLoaded', () => {
    const solicitudesTbody = document.getElementById('solicitudes-tbody');
    const ordenesTbody = document.getElementById('ordenes-tbody');
    const planesTbody = document.getElementById('planes-tbody');
    const addPlanBtn = document.getElementById('add-plan-btn');

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);
            currentUserProfile = userDocSnap.exists() 
                ? { uid: user.uid, email: user.email, ...userDocSnap.data() } 
                : { uid: user.uid, email: user.email, role: 'individual', groupName: null };
            currentUserProfile.isAdmin = currentUserProfile.role === 'admin';

            if (addPlanBtn) addPlanBtn.style.display = 'block';
            
            loadMaintenanceRequests();
            // Las otras cargas se mantienen igual por ahora
            loadWorkOrders(); 
            loadMaintenancePlans();

        } else {
            currentUserProfile = null;
            if (addPlanBtn) addPlanBtn.style.display = 'none';
            clearAllTables();
        }
    });

    async function getEquipmentMap() {
        // Esta función no cambia
        const map = {};
        // ... (código sin cambios)
        return map;
    }

    async function loadMaintenanceRequests() {
        if (!currentUserProfile || !solicitudesTbody) return;
        solicitudesTbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
        
        try {
            // 1. Llamar a la función del servidor
            const getSolicitudes = httpsCallable(functions, 'getSolicitudesMantenimiento');
            const result = await getSolicitudes();
            const solicitudes = result.data.solicitudes;

            const equipmentMap = await getEquipmentMap();
            solicitudesTbody.innerHTML = '';

            if (solicitudes.length === 0) {
                solicitudesTbody.innerHTML = '<tr><td colspan="5">No hay solicitudes pendientes.</td></tr>';
                return;
            }

            solicitudes.forEach(req => {
                const row = document.createElement('tr');
                let adminActions = '';
                if (currentUserProfile.isAdmin) {
                     adminActions = `
                        <button class="btn-approve" data-id="${req.id}">Aprobar</button>
                        <button class="btn-delete-solicitud" data-id="${req.id}">Eliminar</button>
                    `;
                }

                row.innerHTML = `
                    <td>${equipmentMap[req.maquinaId] || 'ID: ' + req.maquinaId}</td>
                    <td>${req.descripcion}</td>
                    <td>${req.solicitanteEmail}</td>
                    <td>${req.fecha ? new Date(req.fecha.seconds * 1000).toLocaleDateString('es-ES') : 'N/A'}</td>
                    <td>${adminActions || '-'}</td>
                `;
                solicitudesTbody.appendChild(row);
            });

            addAdminButtonListeners();

        } catch (error) {
            console.error("Error cargando solicitudes: ", error);
            solicitudesTbody.innerHTML = `<tr><td colspan="5">Error al cargar solicitudes. ${error.message}</td></tr>`;
        }
    }

    // El resto de funciones (loadWorkOrders, loadMaintenancePlans, etc.) permanecen sin cambios por ahora

    function clearAllTables() {
        const message = '<tr><td colspan="6">Inicia sesión para ver los registros.</td></tr>';
        if(solicitudesTbody) solicitudesTbody.innerHTML = message;
        if(ordenesTbody) ordenesTbody.innerHTML = message;
        if(planesTbody) planesTbody.innerHTML = message;
    }
    
    async function getEquipmentMap() {
        const map = {};
        try {
            const querySnapshot = await getDocs(collection(db, "maquinaria"));
            querySnapshot.forEach(doc => {
                map[doc.id] = doc.data().name || 'Nombre Desconocido';
            });
        } catch (error) {
            console.error("Error al obtener mapa de equipos: ", error);
        }
        return map;
    }

    async function loadMaintenanceRequests() {
        if (!currentUserProfile || !solicitudesTbody) return;
        solicitudesTbody.innerHTML = '<tr><td colspan="5">Cargando...</td></tr>';
        const equipmentMap = await getEquipmentMap();
        
        try {
            const queries = [];
            if (currentUserProfile.isAdmin) {
                queries.push(getDocs(collection(db, 'solicitudesMantenimiento')));
            } else {
                queries.push(getDocs(query(collection(db, 'solicitudesMantenimiento'), where('createdBy', '==', currentUserProfile.uid))));
                if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
                    queries.push(getDocs(query(collection(db, 'solicitudesMantenimiento'), where('groupName', '==', currentUserProfile.groupName))));
                }
            }

            const snapshots = await Promise.all(queries);
            const allDocs = new Map();

            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allDocs.has(doc.id)) {
                        allDocs.set(doc.id, doc);
                    }
                });
            });

            solicitudesTbody.innerHTML = '';

            if (allDocs.size === 0) {
                solicitudesTbody.innerHTML = '<tr><td colspan="5">No hay solicitudes pendientes.</td></tr>';
                return;
            }

            allDocs.forEach(doc => {
                const req = doc.data();
                const row = document.createElement('tr');
                
                let adminActions = '';
                if (currentUserProfile.isAdmin) {
                     adminActions = `
                        <button class="btn-approve" data-id="${doc.id}">Aprobar</button>
                        <button class="btn-delete-solicitud" data-id="${doc.id}">Eliminar</button>
                    `;
                }

                row.innerHTML = `
                    <td>${equipmentMap[req.maquinaId] || 'ID: ' + req.maquinaId}</td>
                    <td>${req.descripcion}</td>
                    <td>${req.solicitanteEmail}</td>
                    <td>${req.fecha ? req.fecha.toDate().toLocaleDateString('es-ES') : 'N/A'}</td>
                    <td>${adminActions || '-'}</td>
                `;
                solicitudesTbody.appendChild(row);
            });

            addAdminButtonListeners();

        } catch (error) {
            console.error("Error cargando solicitudes: ", error);
            solicitudesTbody.innerHTML = `<tr><td colspan="5">Error al cargar solicitudes.</td></tr>`;
        }
    }

    async function loadWorkOrders() {
        if (!currentUserProfile || !ordenesTbody) return;
        ordenesTbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        const equipmentMap = await getEquipmentMap();

        try {
            const queries = [];
            if (currentUserProfile.isAdmin) {
                queries.push(getDocs(collection(db, 'ordenes_trabajo')));
            } else {
                queries.push(getDocs(query(collection(db, 'ordenes_trabajo'), where('createdBy', '==', currentUserProfile.uid))));
                if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
                    queries.push(getDocs(query(collection(db, 'ordenes_trabajo'), where('groupName', '==', currentUserProfile.groupName))));
                }
            }

            const snapshots = await Promise.all(queries);
            const allDocs = new Map();
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allDocs.has(doc.id)) {
                        allDocs.set(doc.id, doc);
                    }
                });
            });
            
            ordenesTbody.innerHTML = '';

            if (allDocs.size === 0) {
                ordenesTbody.innerHTML = '<tr><td colspan="6">No hay historial de órdenes de trabajo.</td></tr>';
                return;
            }

            allDocs.forEach(doc => {
                const order = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${order.equipment || 'N/A'}</td>
                    <td>${order.description}</td>
                    <td>${order.type}</td>
                    <td><span class="status-${order.status.toLowerCase()}">${order.status}</span></td>
                    <td>${order.date}</td>
                    <td>-</td>
                `;
                ordenesTbody.appendChild(row);
            });
        } catch (error) {
            console.error("Error cargando órdenes de trabajo: ", error);
            ordenesTbody.innerHTML = `<tr><td colspan="6">Error al cargar las órdenes de trabajo.</td></tr>`;
        }
    }

    async function loadMaintenancePlans() {
         if (!currentUserProfile || !planesTbody) return;
        planesTbody.innerHTML = '<tr><td colspan="6">Cargando...</td></tr>';
        const equipmentMap = await getEquipmentMap();

        try {
            const queries = [];
            if (currentUserProfile.isAdmin) {
                queries.push(getDocs(collection(db, 'planes_mantenimiento')));
            } else {
                queries.push(getDocs(query(collection(db, 'planes_mantenimiento'), where('createdBy', '==', currentUserProfile.uid))));
                if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
                    queries.push(getDocs(query(collection(db, 'planes_mantenimiento'), where('groupName', '==', currentUserProfile.groupName))));
                }
            }

            const snapshots = await Promise.all(queries);
            const allDocs = new Map();
            snapshots.forEach(snapshot => {
                snapshot.forEach(doc => {
                    if (!allDocs.has(doc.id)) {
                        allDocs.set(doc.id, doc);
                    }
                });
            });

            planesTbody.innerHTML = '';

            if (allDocs.size === 0) {
                planesTbody.innerHTML = '<tr><td colspan="6">No hay planes de mantenimiento preventivo.</td></tr>';
                return;
            }
            allDocs.forEach(doc => {
                const plan = doc.data();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${equipmentMap[plan.equipoId] || 'ID: ' + plan.equipoId}</td>
                    <td>${plan.tarea}</td>
                    <td>${plan.frecuencia} días</td>
                    <td>${plan.proximoMantenimiento}</td>
                    <td><span class="status-${plan.estado.toLowerCase()}">${plan.estado}</span></td>
                    <td><button class="btn-edit-plan" data-id="${doc.id}">Editar</button> <button class="btn-delete-plan" data-id="${doc.id}">Eliminar</button></td>
                `;
                planesTbody.appendChild(row);
            });

        } catch (error) {
            console.error("Error cargando planes: ", error);
            planesTbody.innerHTML = `<tr><td colspan="6">Error al cargar los planes.</td></tr>`;
        }
    }

    function clearAllTables() {
        const message = '<tr><td colspan="6">Inicia sesión para ver los registros.</td></tr>';
        if(solicitudesTbody) solicitudesTbody.innerHTML = message;
        if(ordenesTbody) ordenesTbody.innerHTML = message;
        if(planesTbody) planesTbody.innerHTML = message;
    }

    function addAdminButtonListeners() {
        document.querySelectorAll('.btn-approve').forEach(b => b.addEventListener('click', async e => {
            const id = e.target.dataset.id;
            const solicitudRef = doc(db, 'solicitudesMantenimiento', id);
            try {
                const solicitudSnap = await getDoc(solicitudRef);
                if (solicitudSnap.exists()) {
                    const solicitud = solicitudSnap.data();
                    await addDoc(collection(db, 'ordenes_trabajo'), {
                        equipment: (await getEquipmentMap())[solicitud.maquinaId] || 'Equipo Desconocido',
                        description: solicitud.descripcion,
                        type: 'Correctivo',
                        status: 'Pendiente',
                        date: new Date().toISOString().split('T')[0],
                        responsible: 'Sin asignar',
                        createdBy: solicitud.createdBy,
                        groupName: solicitud.groupName
                    });
                    await deleteDoc(solicitudRef);
                    Swal.fire('Aprobada', 'La solicitud se ha movido a Órdenes de Trabajo.', 'success');
                    loadMaintenanceRequests();
                    loadWorkOrders();
                }
            } catch (error) {
                Swal.fire('Error', 'No se pudo aprobar la solicitud.', 'error');
                console.error("Error al aprobar: ", error);
            }
        }));

        document.querySelectorAll('.btn-delete-solicitud').forEach(b => b.addEventListener('click', async e => {
             const id = e.target.dataset.id;
             const result = await Swal.fire({ title: '¿Estás seguro?', text: "Se eliminará la solicitud permanentemente.", icon: 'warning', showCancelButton: true });
             if (result.isConfirmed) {
                try {
                    await deleteDoc(doc(db, 'solicitudesMantenimiento', id));
                    Swal.fire('Eliminada', 'La solicitud ha sido eliminada.', 'success');
                    loadMaintenanceRequests();
                } catch (error) {
                    Swal.fire('Error', 'No se pudo eliminar la solicitud.', 'error');
                }
             }
        }));
    }
});
