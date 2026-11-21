// Capa de datos: dos almacenes con la misma interfaz (Store, en ../types.ts).
//  - firebase.ts: el de verdad (Firebase Authentication + Firestore).
//  - demo.ts: el de demostración (localStorage), con ?demo en la dirección.
export { createFirebaseStore } from "./firebase";
export { createDemoStore } from "./demo";
