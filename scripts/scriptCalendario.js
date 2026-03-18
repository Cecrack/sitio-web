import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { 
    getAuth, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { 
    getFirestore,
    collection, 
    getDocs, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc,
    getDoc,
    query,
    where
} from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

// Tu configuración de Firebase (ajusta si es necesario o importa desde otro archivo)
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

// Perfil del usuario y estado del calendario
let currentUserProfile = null;
let currentDate = new Date();
let currentOpenEvent = null;

// === MANEJO DE MODALES ===
window.openModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.getElementById('overlay').classList.add('active');
    }
};

window.closeModal = (modalId) => {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.getElementById('overlay').classList.remove('active');
    }
};

// --- RENDERIZADO DEL CALENDARIO ---
async function getEquipmentMap() {
    const equipmentMap = {};
    const q = collection(db, "maquinaria");
    // En el futuro, se podría filtrar maquinaria por grupo si fuera necesario
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(doc => {
        equipmentMap[doc.id] = doc.data().name;
    });
    return equipmentMap;
}

async function renderCalendar(date) {
    const calendarGrid = document.getElementById('calendar-grid');
    const currentMonthYear = document.getElementById('current-month-year');
    
    calendarGrid.innerHTML = '<div class="calendar-header">Domingo</div><div class="calendar-header">Lunes</div><div class="calendar-header">Martes</div><div class="calendar-header">Miércoles</div><div class="calendar-header">Jueves</div><div class="calendar-header">Viernes</div><div class="calendar-header">Sábado</div>';

    if (!currentUserProfile) {
        currentMonthYear.textContent = "Inicie sesión para ver el calendario";
        return;
    }

    const month = date.getMonth();
    const year = date.getFullYear();
    currentMonthYear.textContent = `${date.toLocaleString('es-ES', { month: 'long' })} ${year}`;

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const startDayOfWeek = firstDayOfMonth.getDay(); 

    const allEvents = await fetchAllEvents(year, month);

    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek; i > 0; i--) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day', 'other-month');
        dayDiv.innerHTML = `<span class="day-number">${prevLastDay - i + 1}</span>`;
        calendarGrid.appendChild(dayDiv);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');

        const today = new Date();
        if (year === today.getFullYear() && month === today.getMonth() && day === today.getDate()) {
            dayDiv.classList.add('today');
        }
        dayDiv.innerHTML = `<span class="day-number">${day}</span>`;

        const dayEvents = allEvents.filter(eventData => {
            const eventDate = new Date(eventData.date + 'T00:00:00'); // Hora local
            return eventDate.getFullYear() === year && eventDate.getMonth() === month && eventDate.getDate() === day;
        });

        dayEvents.forEach(eventData => {
            const eventDiv = document.createElement('div');
            let eventClass = '', iconHtml = '';

            if (eventData.source === 'ordenes_trabajo') {
                const status = eventData.details.status.toLowerCase().replace(' ', '-');
                eventClass = `event-${status}`;
                iconHtml = '<span class="material-icons">build</span>';
            } else if (eventData.source === 'planes_mantenimiento') {
                eventClass = 'event-plan';
                iconHtml = '<span class="material-icons">calendar_today</span>';
            } else { // historial_medico
                eventClass = 'event-animal';
                iconHtml = '<span class="material-icons">pets</span>';
            }
            eventDiv.classList.add('event', eventClass);
            eventDiv.innerHTML = `${iconHtml}<span>${eventData.title}</span>`;
            eventDiv.addEventListener('click', (e) => { e.stopPropagation(); showEventDetails(eventData); });
            dayDiv.appendChild(eventDiv);
        });
        calendarGrid.appendChild(dayDiv);
    }
}

// --- OBTENCIÓN DE DATOS DE FIREBASE (CON FILTROS) ---
async function fetchAllEvents(year, month) {
    if (!currentUserProfile) return [];

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const allEvents = [];
    const equipmentMap = await getEquipmentMap();

    const collectionsToFetch = {
        ordenes_trabajo: 'date',
        historial_medico: 'eventDate',
        planes_mantenimiento: null // Se maneja de forma diferente
    };

    for (const [colName, dateField] of Object.entries(collectionsToFetch)) {
        let q = collection(db, colName);

        // Aplicar filtros según el rol del usuario
        if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
            q = query(q, where("groupName", "==", currentUserProfile.groupName));
        } else if (!currentUserProfile.isAdmin) {
            q = query(q, where("createdBy", "==", currentUserProfile.uid));
        }

        const snapshot = await getDocs(q);

        if (colName === 'planes_mantenimiento') {
            snapshot.forEach(doc => {
                const plan = doc.data();
                if (plan.estado !== 'Activo' || !plan.proximoMantenimiento || !plan.frecuencia) return;
                
                const frequency = parseInt(plan.frecuencia);
                if (isNaN(frequency) || frequency <= 0) return;

                let nextMaintDate = new Date(plan.proximoMantenimiento + 'T00:00:00');
                const equipmentName = equipmentMap[plan.equipoId] || 'Equipo Desconocido';
                const title = `${equipmentName}: ${plan.tarea}`;
                const lookaheadLimit = new Date(endDate);
                lookaheadLimit.setFullYear(lookaheadLimit.getFullYear() + 1);

                while (nextMaintDate <= lookaheadLimit) {
                    if (nextMaintDate >= startDate && nextMaintDate <= endDate) {
                        allEvents.push({
                            id: doc.id, 
                            source: 'planes_mantenimiento',
                            date: nextMaintDate.toISOString().split('T')[0],
                            title: title,
                            details: { ...plan, proximoMantenimiento: nextMaintDate.toISOString().split('T')[0] }
                        });
                    }
                    if (nextMaintDate > endDate) break;
                    nextMaintDate.setDate(nextMaintDate.getDate() + frequency);
                }
            });
        } else {
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data[dateField]) return;
                const eventDate = new Date(data[dateField] + 'T00:00:00');

                if (eventDate >= startDate && eventDate <= endDate) {
                    allEvents.push({
                        id: doc.id,
                        source: colName,
                        date: data[dateField],
                        title: colName === 'ordenes_trabajo' ? data.equipment : `Animal: ${data.animalId}`,
                        details: data
                    });
                }
            });
        }
    }
    return allEvents;
}

// --- DETALLES DEL EVENTO Y FORMULARIOS ---
function showEventDetails(eventData) {
    currentOpenEvent = eventData;
    const detailsBody = document.getElementById('event-details-body');
    const editBtn = document.getElementById('edit-event-btn');
    const deleteBtn = document.getElementById('delete-event-btn');
    let content = '';
    const { source, details, date } = eventData;

    editBtn.style.display = (source !== 'planes_mantenimiento') ? 'inline-block' : 'none';
    deleteBtn.style.display = (source !== 'planes_mantenimiento') ? 'inline-block' : 'none';

    if (source === 'ordenes_trabajo') {
        content = `<p><strong>Equipo:</strong> ${details.equipment}</p><p><strong>Tipo:</strong> ${details.type}</p><p><strong>Fecha:</strong> ${details.date}</p><p><strong>Responsable:</strong> ${details.responsible}</p><p><strong>Descripción:</strong> ${details.description}</p><p><strong>Estado:</strong> ${details.status}</p>`;
    } else if (source === 'planes_mantenimiento') {
        const equipmentName = currentOpenEvent.title.split(':')[0];
        content = `<p><strong>Equipo:</strong> ${equipmentName}</p><p><strong>Tarea:</strong> ${details.tarea}</p><p><strong>Fecha Mantenimiento:</strong> ${date}</p><p><strong>Frecuencia:</strong> Cada ${details.frecuencia} días</p><p><strong>Estado del Plan:</strong> ${details.estado}</p><hr><p><i>Evento recurrente. Edite desde "Planes de Mantenimiento".</i></p>`;
    } else { // historial_medico
        content = `<p><strong>Animal (ID/RFID):</strong> ${details.animalId}</p><p><strong>Evento:</strong> ${details.eventType}</p><p><strong>Fecha:</strong> ${details.eventDate}</p><p><strong>Veterinario:</strong> ${details.veterinarian}</p><p><strong>Descripción:</strong> ${details.description}</p>`;
    }
    detailsBody.innerHTML = content;
    openModal('event-details-modal');
}

async function openEventForm(type, event = null) {
    closeModal('create-event-modal');
    closeModal('event-details-modal');
    const isEdit = event !== null;

    if (type === 'maquinaria') {
        const form = document.getElementById('form-maquinaria');
        form.reset();
        document.getElementById('maquinaria-modal-title').textContent = isEdit ? 'Editar Orden de Trabajo' : 'Crear Orden de Trabajo';
        document.getElementById('maquinaria-event-id').value = isEdit ? event.id : '';

        const select = document.getElementById('maquinaria-equipo');
        select.innerHTML = '';
        const querySnapshot = await getDocs(collection(db, 'maquinaria'));
        querySnapshot.forEach(doc => {
            select.add(new Option(doc.data().name, doc.data().name));
        });

        if (isEdit) {
            Object.keys(event.details).forEach(key => {
                const el = document.getElementById(`maquinaria-${key}`);
                if(el) el.value = event.details[key];
            });
        }
        openModal('form-maquinaria-modal');

    } else { // animal
        const form = document.getElementById('form-animal');
        form.reset();
        document.getElementById('animal-modal-title').textContent = isEdit ? 'Editar Evento de Animal' : 'Crear Evento de Animal';
        document.getElementById('animal-event-id').value = isEdit ? event.id : '';

        const select = document.getElementById('animal-id');
        select.innerHTML = '';
        
        let q = collection(db, 'vacas');
        if (currentUserProfile.role === 'grupo' && currentUserProfile.groupName) {
            q = query(q, where("groupName", "==", currentUserProfile.groupName));
        } else if (!currentUserProfile.isAdmin) {
             q = query(q, where("createdBy", "==", currentUserProfile.uid));
        }

        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            select.add(new Option(doc.data().rfid, doc.data().rfid));
        });

        if (isEdit) {
             Object.keys(event.details).forEach(key => {
                const el = document.getElementById(`animal-${key.replace('event', '').toLowerCase()}`);
                if(el) el.value = event.details[key];
            });
        }
        openModal('form-animal-modal');
    }
}

// --- GUARDAR Y ELIMINAR (CON CONTEXTO DE USUARIO) ---
async function saveMaquinaria(e) {
    e.preventDefault();
    if(!currentUserProfile) return Swal.fire('Error', 'Debe iniciar sesión', 'error');
    
    const eventId = document.getElementById('maquinaria-event-id').value;
    const data = {
        equipment: document.getElementById('maquinaria-equipo').value,
        type: document.getElementById('maquinaria-tipo').value,
        date: document.getElementById('maquinaria-fecha').value,
        responsible: document.getElementById('maquinaria-responsable').value,
        description: document.getElementById('maquinaria-descripcion').value,
        status: document.getElementById('maquinaria-estado').value,
        createdBy: currentUserProfile.uid,
        groupName: currentUserProfile.groupName || null
    };

    try {
        if (eventId) {
            await updateDoc(doc(db, 'ordenes_trabajo', eventId), data);
        } else {
            await addDoc(collection(db, 'ordenes_trabajo'), data);
        }
        Swal.fire('Éxito', 'Orden de trabajo guardada', 'success');
        closeModal('form-maquinaria-modal');
        renderCalendar(currentDate);
    } catch (error) { Swal.fire('Error', `Ocurrió un error: ${error.message}`, 'error'); }
}

async function saveAnimal(e) {
    e.preventDefault();
    if(!currentUserProfile) return Swal.fire('Error', 'Debe iniciar sesión', 'error');

    const eventId = document.getElementById('animal-event-id').value;
    const data = {
        animalId: document.getElementById('animal-id').value,
        eventType: document.getElementById('animal-evento').value,
        eventDate: document.getElementById('animal-fecha').value,
        veterinarian: document.getElementById('animal-veterinario').value,
        description: document.getElementById('animal-descripcion').value,
        createdBy: currentUserProfile.uid,
        groupName: currentUserProfile.groupName || null
    };

    try {
        if (eventId) {
            await updateDoc(doc(db, 'historial_medico', eventId), data);
        } else {
            await addDoc(collection(db, 'historial_medico'), data);
        }
        Swal.fire('Éxito', 'Evento de animal guardado', 'success');
        closeModal('form-animal-modal');
        renderCalendar(currentDate);
    } catch (error) { Swal.fire('Error', `Ocurrió un error: ${error.message}`, 'error'); }
}

async function deleteEvent() {
    if (!currentOpenEvent) return;
    const { id, source, title } = currentOpenEvent;

    if (source === 'planes_mantenimiento') {
        return Swal.fire('Acción no permitida', 'Elimine desde la página de "Planes de Mantenimiento".', 'info');
    }

    const result = await Swal.fire({
        title: '¿Estás seguro?', text: `Se eliminará "${title}".`, icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí, eliminar'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, source, id));
            Swal.fire('Eliminado', 'El evento ha sido eliminado.', 'success');
            closeModal('event-details-modal');
            renderCalendar(currentDate);
        } catch (error) { Swal.fire('Error', `No se pudo eliminar: ${error.message}`, 'error'); }
    }
}


// --- INICIALIZACIÓN Y AUTENTICACIÓN ---
function setupEventListeners() {
    document.getElementById('prev-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(currentDate); });
    document.getElementById('next-month-btn').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(currentDate); });
    document.getElementById('create-event-btn').addEventListener('click', () => openModal('create-event-modal'));
    document.getElementById('btn-create-maquinaria').addEventListener('click', () => openEventForm('maquinaria'));
    document.getElementById('btn-create-animal').addEventListener('click', () => openEventForm('animal'));
    document.getElementById('form-maquinaria').addEventListener('submit', saveMaquinaria);
    document.getElementById('form-animal').addEventListener('submit', saveAnimal);
    document.getElementById('edit-event-btn').addEventListener('click', () => { if (!currentOpenEvent) return; const type = currentOpenEvent.source === 'ordenes_trabajo' ? 'maquinaria' : 'animal'; openEventForm(type, currentOpenEvent); });
    document.getElementById('delete-event-btn').addEventListener('click', deleteEvent);
    document.querySelectorAll('.modal-close').forEach(button => button.addEventListener('click', () => closeModal(button.closest('.modal').id)));
    document.getElementById('overlay').addEventListener('click', () => document.querySelectorAll('.modal.active').forEach(modal => closeModal(modal.id)));
}

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    
    onAuthStateChanged(auth, async (user) => {
        const createEventBtn = document.getElementById('create-event-btn');
        if (user) {
            const userDocRef = doc(db, "usuarios", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            let userData = {};
            if (userDocSnap.exists()) userData = userDocSnap.data();

            currentUserProfile = {
                uid: user.uid,
                email: user.email,
                role: userData.role || 'individual',
                groupName: userData.groupName || null,
                isAdmin: userData.role === 'admin'
            };
            
            createEventBtn.style.display = 'block';
            renderCalendar(currentDate);

        } else {
            currentUserProfile = null;
            createEventBtn.style.display = 'none';
            // Limpiar calendario si el usuario cierra sesión
            const calendarGrid = document.getElementById('calendar-grid');
            calendarGrid.innerHTML = '<div class="calendar-header">Domingo</div><div class="calendar-header">Lunes</div><div class="calendar-header">Martes</div><div class="calendar-header">Miércoles</div><div class="calendar-header">Jueves</div><div class="calendar-header">Viernes</div><div class="calendar-header">Sábado</div>';
            document.getElementById('current-month-year').textContent = "Inicie sesión para ver el calendario";
        }
    });
});
