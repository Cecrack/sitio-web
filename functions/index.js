const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializar Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Cloud Function para inicializar la base de datos
exports.initFirestore = functions.https.onRequest(async (req, res) => {
    try {
    // Crear colecciones y documentos iniciales
        await db.collection("usuarios").doc("admin").set({
            nombre: "Administrador Principal",
            email: "admin@ganaderia.com",
            rol: "Administrador",
            fechaRegistro: new Date().toISOString(),
        });

        await db.collection("vacas").doc("vaca001").set({
            rfid: "12345ABCDE",
            identificadorInterno: "001",
            raza: "Holstein",
            sexo: "Hembra",
            peso: 600,
            fechaIngreso: "2024-01-15",
            estadoSalud: "Bueno",
            ubicacion: "Corral A",
        });

        await db.collection("vacas").doc("vaca001").collection("historialSanitario").add({
            fecha: "2024-01-01",
            evento: "Vacunación",
            descripcion: "Vacuna contra brucelosis",
        });

        await db.collection("configuraciones").doc("ubicaciones").set({
            clave: "ubicacionesValidas",
            valor: ["Corral A", "Corral B", "Corral C"],
        });

        res.status(200).send("Estructura de Firestore inicializada correctamente.");
    } catch (error) {
        console.error("Error al inicializar Firestore:", error);
        res.status(500).send("Error al inicializar Firestore.");
    }
});
