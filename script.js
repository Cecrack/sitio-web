// Selección de elementos
const btnInicio = document.getElementById("btn-inicio");
const btnInventario = document.getElementById("btn-inventario");
const btnReportes = document.getElementById("btn-reportes");
const btnConsulta = document.getElementById("btn-consulta");
const btnPanel = document.getElementById("btn-panel");
const textContainer = document.getElementById("text-container");

// Funciones para cambiar el contenido
btnInicio.addEventListener("click", function() {
    textContainer.innerHTML = ""; // Limpiar el contenido anterior
    textContainer.innerHTML = `
        <h1>Bienvenidos a Ganadería Inteligente</h1>
        <h3>Transformando la gestión de ganado con tecnología avanzada</h3>
        <p>
            Bienvenido a Ganadería Inteligente, una plataforma diseñada para optimizar y modernizar 
            la gestión de inventario de animales en una ganadería. <br><br>
            Gracias al uso de tecnologías como RFID, cámaras de alta resolución, y sistemas de monitoreo 
            en tiempo real, te ofrecemos una solución que reduce los errores humanos, mejora el seguimiento 
            del estado de salud del ganado y te proporciona datos precisos y actualizados.
        </p>
    `;
});

btnInventario.addEventListener("click", function() {
    textContainer.innerHTML = ""; // Limpiar el contenido anterior
    textContainer.innerHTML = "<h2>Gestión de Inventario</h2><p>Aquí podrás gestionar el inventario de animales en la ganadería.</p>";
});

btnReportes.addEventListener("click", function() {
    textContainer.innerHTML = ""; // Limpiar el contenido anterior
    textContainer.innerHTML = "<h2>Reportes</h2><p>En esta sección podrás generar y visualizar los reportes del sistema.</p>";
});

btnConsulta.addEventListener("click", function() {
    textContainer.innerHTML = ""; // Limpiar el contenido anterior
    textContainer.innerHTML = "<h2>Consulta</h2><p>Consulta la información relacionada con el ganado y sus estados de salud.</p>";
});

btnPanel.addEventListener("click", function() {
    textContainer.innerHTML = ""; // Limpiar el contenido anterior
    textContainer.innerHTML = "<h2>Panel de Administración</h2><p>Accede a las herramientas de administración del sistema.</p>";
});
