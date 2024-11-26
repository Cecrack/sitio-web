// Cambiar el título del encabezado dinámicamente
document.addEventListener("DOMContentLoaded", () => {
    const pageTitles = {
        "inicio.html": "Inicio",
        "inventario.html": "Gestión de Inventario",
        "reportes.html": "Reportes",
        "consulta.html": "Consulta",
        "panel.html": "Panel de Administración"
    };

    // Obtener el nombre del archivo actual
    const currentPage = window.location.pathname.split("/").pop();

    // Cambiar el título del encabezado si coincide
    const headerTitle = document.getElementById("page-title");
    if (headerTitle && pageTitles[currentPage]) {
        headerTitle.textContent = pageTitles[currentPage];
    }
    
    // Función para abrir un modal
    window.openModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("active");

            // Mostrar overlay si es necesario
            const overlay = document.getElementById("overlay");
            if (overlay) {
                overlay.classList.add("active");
            }
        }
    };

    // Función para cerrar un modal
    window.closeModal = (modalId) => {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("active");

            // Ocultar overlay si no hay más modales abiertos
            const activeModals = document.querySelectorAll(".modal.active");
            if (activeModals.length === 0) {
                const overlay = document.getElementById("overlay");
                if (overlay) {
                    overlay.classList.remove("active");
                }
            }
        }
    };

    // Función para confirmar la eliminación
    window.confirmDelete = () => {
        openModal("modal-confirmar");
    };

    // Función para eliminar una vaca
    window.deleteCow = () => {
        alert("La vaca ha sido eliminada con éxito.");

        // Cerrar ambos modales
        closeModal("modal-confirmar");
        closeModal("modal-eliminar");
    };
});
