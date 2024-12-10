// Importar los módulos necesarios de Firebase
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getAuth, onAuthStateChanged, updateProfile, updatePassword, signOut } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
import { EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-auth.js';
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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const storage = getStorage(app);

// Verificar si el usuario está autenticado
onAuthStateChanged(auth, (user) => {
    if (user) {
        // Mostrar correo electrónico del usuario
        document.getElementById("user-email").textContent = user.email;

        // Mostrar foto de perfil
        const profilePic = user.photoURL || "../images/default-profile.png"; // Imagen por defecto si no hay foto
        document.getElementById("profile-pic").src = profilePic;
    } else {
        // Redirigir a la página de inicio si no hay usuario autenticado
        window.location.href = "../index.html";
    }
});

// Cambiar la contraseña
document.getElementById("change-password-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById("current-password").value;
    const newPassword = document.getElementById("new-password").value;

    try {
        const user = auth.currentUser;

        // Reautenticar al usuario antes de cambiar la contraseña
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);
        console.log("Reautenticación exitosa.");

        // Cambiar la contraseña
        await updatePassword(user, newPassword);
        alert("Contraseña actualizada con éxito.");
        document.getElementById("change-password-form").reset();
    } catch (error) {
        console.error("Error al cambiar la contraseña:", error);

        if (error.code === "auth/wrong-password") {
            alert("La contraseña actual es incorrecta.");
        } else if (error.code === "auth/weak-password") {
            alert("La nueva contraseña debe tener al menos 6 caracteres.");
        } else {
            alert("No se pudo cambiar la contraseña. Intenta nuevamente.");
        }
    }
});

// Cerrar sesión
document.getElementById("logout-btn").addEventListener("click", async () => {
    try {
        await signOut(auth);
        alert("Has cerrado sesión.");
        window.location.href = "../index.html";
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        alert("No se pudo cerrar la sesión. Intenta nuevamente.");
    }
});

// Cambiar la foto de perfil
document.getElementById("change-pic-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById("profile-pic-file");
    const file = fileInput.files[0];

    if (!file) {
        alert("Por favor, selecciona un archivo.");
        return;
    }

    try {
        // Subir la imagen al almacenamiento de Firebase
        const userId = auth.currentUser.uid; // Usar el UID del usuario para una ruta única
        const storageRef = ref(storage, `profile_pictures/${userId}/${file.name}`);
        await uploadBytes(storageRef, file);

        // Obtener la URL de descarga de la imagen subida
        const photoURL = await getDownloadURL(storageRef);

        // Actualizar la foto de perfil del usuario
        await updateProfile(auth.currentUser, { photoURL });
        document.getElementById("profile-pic").src = photoURL;

        alert("Foto de perfil actualizada con éxito.");
        fileInput.value = ""; // Limpiar el campo de archivo
    } catch (error) {
        console.error("Error al actualizar la foto de perfil:", error);
        alert("No se pudo actualizar la foto de perfil. Intenta nuevamente.");
    }
});
