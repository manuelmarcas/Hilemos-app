// Configuración de Firebase. Es la del proyecto original (votaciones-9bc95).
// Estos valores son públicos por diseño: lo que protege los datos son las reglas
// de Firestore (firestore.rules), que hay que publicar en la consola de Firebase.
//
// Si dejas el objeto vacío ({}), la app funciona siempre en modo demo (localStorage).
import type { FirebaseOptions } from "firebase/app";

export const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCOQU09rJy8_au8mls3b8a82LVreDsNVzU",
  // El mismo dominio que la web: con firebaseapp.com, Safari en iPhone separa el almacenamiento de los dos
  // dominios y el inicio de sesión falla con «missing initial state». Requiere la URI de redirección
  // https://votaciones-9bc95.web.app/__/auth/handler en el cliente OAuth de Google Cloud.
  authDomain: "votaciones-9bc95.web.app",
  projectId: "votaciones-9bc95",
  storageBucket: "votaciones-9bc95.firebasestorage.app",
  messagingSenderId: "1092387940683",
  appId: "1:1092387940683:web:bd7e18f88fef6f0b32a0ce",
};

/**
 * Clave pública de los avisos (Configuración del proyecto > Cloud Messaging > Certificados push web).
 * Es pública como el resto de esta configuración. Vacía: la app no ofrece los avisos (ver app/README.md).
 */
export const fcmVapidKey = "";
