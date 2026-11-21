// Clave de acceso de las cuentas sin registro, sin servidor.
//
// Quien entra sin cuenta recibe una clave de 20 caracteres, p. ej. 7KQ2-M9XF-4TBD-HR8P-W3NC. La app la guarda como
// una cuenta interna de correo y contraseña vinculada a su uid: los 8 primeros caracteres forman un correo ficticio
// (7kq2m9xf@clave.hilemos.web.app, que no recibe nada) y los 12 últimos son la contraseña, que Firebase guarda
// cifrada. Entrar con la clave es entrar con ese correo y contraseña: mismo uid, mismos datos. Firebase bloquea un
// rato a quien falla muchas veces, y las reglas de Firestore tratan esas cuentas como «sin cuenta».

export const KEY_DOMAIN = "clave.hilemos.web.app";
const KEY_ABC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sin 0/O ni 1/I/L: no se confunden al copiarla a mano
const KEY_ID = 8;      // caracteres que forman el correo ficticio
const KEY_SECRET = 12; // caracteres de la contraseña (unos 59 bits: imposible de adivinar)

/** El correo es el ficticio de una clave de acceso (no es un correo de verdad). */
export const isKeyEmail = (e?: string | null) => !!e && e.toLowerCase().endsWith("@" + KEY_DOMAIN);

/** `n` caracteres al azar del alfabeto de las claves, sin sesgo (se descartan los bytes ≥ 248 = 8 × 31). */
function randomKeyChars(n: number) {
  let out = "";
  const buf = new Uint8Array(1);
  while (out.length < n) {
    crypto.getRandomValues(buf);
    if (buf[0] < 248) out += KEY_ABC[buf[0] % KEY_ABC.length];
  }
  return out;
}

const keyEmail = (id: string) => `${id.toLowerCase()}@${KEY_DOMAIN}`;

/** Credenciales de una clave: el correo ficticio y la contraseña. */
export interface KeyCredentials {
  email: string;
  password: string;
}

/** Clave nueva: las credenciales que se vinculan a la cuenta y el texto que se le enseña («XXXX-XXXX-…»). */
export function newAccessKey(): KeyCredentials & { display: string } {
  const id = randomKeyChars(KEY_ID), secret = randomKeyChars(KEY_SECRET);
  return { email: keyEmail(id), password: secret, display: (id + secret).match(/.{4}/g)!.join("-") };
}

/**
 * Lo que escribe la persona al entrar con su clave: da igual mayúsculas, minúsculas, guiones o espacios.
 * null si no tiene la longitud de una clave.
 */
export function parseAccessKey(input: string): KeyCredentials | null {
  const k = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (k.length !== KEY_ID + KEY_SECRET) return null;
  return { email: keyEmail(k.slice(0, KEY_ID)), password: k.slice(KEY_ID) };
}
