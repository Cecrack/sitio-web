
// Versión 11 - Corregidos errores de linter para despliegue
const admin = require("firebase-admin");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

admin.initializeApp();

// Función para verificar si el grupo de un usuario tiene un administrador
exports.checkIfGroupHasAdmin = onCall({region: "us-central1"}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debe estar autenticado para realizar esta acción.");
    }

    const uid = request.auth.uid;
    const user = await admin.auth().getUser(uid);
    const groupName = user.customClaims && user.customClaims.groupName;

    if (!groupName) {
        return {hasAdmin: true};
    }

    try {
        const userRecords = await admin.auth().listUsers(1000);
        const groupHasAdmin = userRecords.users.some(
            (u) => u.customClaims && u.customClaims.groupName === groupName && u.customClaims.role === "administrador",
        );
        return {hasAdmin: groupHasAdmin};
    } catch (error) {
        console.error("Error al verificar si el grupo tiene administrador:", error);
        throw new HttpsError("internal", "Error al procesar la solicitud.");
    }
});

exports.checkAuth = onCall({region: "us-central1"}, (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Not authenticated.");
    }
    return {status: "success", message: `Authenticated as ${request.auth.token.email}`};
});

exports.setCustomClaimsOnUserCreate = onDocumentCreated("usuarios/{uid}", async (event) => {
    const snap = event.data;
    if (!snap) {
        return;
    }
    const userData = snap.data();
    const uid = event.params.uid;
    try {
        const claims = {};
        if (userData.role) {
            claims.role = userData.role;
        }
        if (userData.groupName) {
            claims.groupName = userData.groupName;
        }
        await admin.auth().setCustomUserClaims(uid, claims);
    } catch (error) {
        console.error(`Error al asignar permisos para ${uid}:`, error);
    }
});

exports.getUsers = onCall({region: "us-central1"}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const requesterAuth = request.auth;
    const requesterClaims = requesterAuth.token || {};
    const requesterIsAdmin = requesterClaims.role === "administrador";
    const requesterGroupName = requesterClaims.groupName;
    const requesterUid = requesterAuth.uid;
    try {
        const userRecords = await admin.auth().listUsers(1000);
        if (requesterIsAdmin) {
            const filteredUsers = userRecords.users.filter((user) => {
                const userGroupName = user.customClaims ? user.customClaims.groupName : undefined;
                if (requesterGroupName) {
                    return userGroupName === requesterGroupName;
                } else {
                    return user.uid === requesterUid;
                }
            }).map((user) => ({
                uid: user.uid,
                email: user.email,
                provider: user.providerData.length > 0 ? user.providerData[0].providerId : "password",
                metadata: {
                    creationTime: user.metadata.creationTime,
                    lastSignInTime: user.metadata.lastSignInTime,
                },
                customClaims: user.customClaims,
            }));
            return {users: filteredUsers};
        } else {
            return {users: []}; // No-admins no deben poder listar usuarios
        }
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error al obtener la lista de usuarios:", error);
        throw new HttpsError("internal", "Error al procesar la solicitud de usuarios.");
    }
});

exports.setUserRole = onCall({region: "us-central1"}, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const {uid, role} = request.data;
    const requesterAuth = request.auth;
    const requesterClaims = requesterAuth.token || {};

    if (requesterClaims.role === "administrador") {
        try {
            const userToUpdate = await admin.auth().getUser(uid);
            const currentClaims = userToUpdate.customClaims || {};
            if (currentClaims.groupName !== requesterClaims.groupName) {
                throw new HttpsError("permission-denied", "Un administrador solo puede cambiar roles a usuarios de su propio grupo.");
            }
            await admin.auth().setCustomUserClaims(uid, {...currentClaims, role: role});
            return {message: `Rol de usuario actualizado a: ${role}`};
        } catch (error) {
            throw new HttpsError("internal", "Error al actualizar rol.");
        }
    }

    if (role === "administrador" && uid === requesterAuth.uid) {
        const user = await admin.auth().getUser(uid);
        const groupName = user.customClaims && user.customClaims.groupName;
        if (groupName) {
            const userRecords = await admin.auth().listUsers(1000);
            const groupHasAdmin = userRecords.users.some(
                (u) => u.customClaims && u.customClaims.groupName === groupName && u.customClaims.role === "administrador",
            );
            if (!groupHasAdmin) {
                await admin.auth().setCustomUserClaims(uid, {...user.customClaims, role: "administrador"});
                return {message: "Te has convertido en el administrador del grupo."};
            }
        }
    }

    throw new HttpsError("permission-denied", "No tienes permisos para realizar esta acción.");
});

exports.deleteUser = onCall({region: "us-central1"}, async (request) => {
    const requesterAuth = request.auth;
    if (!requesterAuth) {
        throw new HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const requesterClaims = requesterAuth.token || {};

    if (requesterClaims.role !== "administrador") {
        throw new HttpsError("permission-denied", "Solo los administradores pueden eliminar usuarios.");
    }

    const {uid} = request.data;
    const requesterGroupName = requesterClaims.groupName;

    try {
        if (uid === requesterAuth.uid) {
            throw new HttpsError("permission-denied", "Un administrador no se puede eliminar a sí mismo.");
        }

        const userToDelete = await admin.auth().getUser(uid);
        const userToDeleteClaims = userToDelete.customClaims || {};

        if (!requesterGroupName || userToDeleteClaims.groupName !== requesterGroupName) {
            throw new HttpsError("permission-denied", "No tienes permiso para eliminar a este usuario.");
        }

        await admin.auth().deleteUser(uid);
        await admin.firestore().collection("usuarios").doc(uid).delete();

        return {message: `Usuario ${userToDelete.email} eliminado exitosamente.`};
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error al eliminar usuario:", error);
        throw new HttpsError("internal", "Error al procesar la solicitud para eliminar usuario.");
    }
});

exports.updateUserPassword = onCall({region: "us-central1"}, async (request) => {
    const requesterAuth = request.auth;
    if (!requesterAuth) {
        throw new HttpsError("unauthenticated", "Debe estar autenticado.");
    }
    const requesterClaims = requesterAuth.token || {};

    if (requesterClaims.role !== "administrador") {
        throw new HttpsError("permission-denied", "Solo los administradores pueden cambiar contraseñas.");
    }

    const {uid, newPassword} = request.data;
    const requesterGroupName = requesterClaims.groupName;

    if (!newPassword || newPassword.length < 6) {
        throw new HttpsError("invalid-argument", "La nueva contraseña debe tener al menos 6 caracteres.");
    }

    try {
        const userToUpdate = await admin.auth().getUser(uid);
        const userToUpdateClaims = userToUpdate.customClaims || {};

        if (!requesterGroupName || userToUpdateClaims.groupName !== requesterGroupName) {
            throw new HttpsError("permission-denied", "No tienes permiso para modificar a este usuario.");
        }

        await admin.auth().updateUser(uid, {password: newPassword});

        return {message: `Contraseña para ${userToUpdate.email} actualizada exitosamente.`};
    } catch (error) {
        if (error instanceof HttpsError) {
            throw error;
        }
        console.error("Error al actualizar la contraseña:", error);
        throw new HttpsError("internal", "Error al procesar la solicitud para actualizar contraseña.");
    }
});

exports.createUser = onCall({region: "us-central1"}, async (request) => {
    if (!request.auth || request.auth.token.role !== "administrador") {
        throw new HttpsError("permission-denied", "Solo los administradores pueden crear usuarios.");
    }

    const {email, password, groupName} = request.data;
    const requesterGroupName = request.auth.token.groupName;

    if (groupName !== requesterGroupName) {
        throw new HttpsError("permission-denied", "No puedes crear usuarios en un grupo diferente al tuyo.");
    }

    try {
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });

        const claims = {role: "operador", groupName: groupName};
        await admin.auth().setCustomUserClaims(userRecord.uid, claims);

        return {uid: userRecord.uid, isNewGroup: false};
    } catch (error) {
        console.error("Error al crear el usuario:", error);
        if (error.code === "auth/email-already-exists") {
            throw new HttpsError("already-exists", "El correo electrónico ya está en uso.");
        }
        throw new HttpsError("internal", "Ocurrió un error al crear el usuario.");
    }
});
