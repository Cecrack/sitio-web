const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true }); // Permite todas las solicitudes

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

exports.getUsers = functions.https.onRequest((req, res) => {
  // Habilita CORS
  cors(req, res, async () => {
    try {
      // Verificación del token del usuario
      if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      const token = req.headers.authorization.split("Bearer ")[1];
      const decodedToken = await admin.auth().verifyIdToken(token);

      // Verificar si el usuario tiene permisos de administrador
      if (!decodedToken.admin) {
        return res.status(403).json({ error: "No tienes permisos para acceder a esta función." });
      }

      // Obtener usuarios
      const listUsersResult = await admin.auth().listUsers();
      const users = listUsersResult.users.map(userRecord => ({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName || "Sin nombre"
      }));

      return res.status(200).json({ users });
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      return res.status(500).json({ error: error.message });
    }
  });
});
