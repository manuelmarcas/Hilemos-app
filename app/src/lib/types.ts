// Tipos del modelo de datos (ver README: "Modelo de datos (Firestore)").

export type PollType = "hours" | "days" | "weeks" | "months";

export interface PollOption {
  id: string;
  name: string;
  icon: string;
}

export interface Tiebreak {
  id: number;
  candidates: string[]; // claves "<casilla>|<opción>"
  done: boolean;
  round?: number;
  finishedAt?: number;
}

/** Documento `polls/{id}` tal como se guarda. */
export interface PollData {
  v?: number;
  title: string;
  description?: string;
  type: PollType;
  months: string[];
  slots: string[];
  /** Franjas periódicas (mismas horas en todos los días). Vacío con `hourList`. */
  hours?: string[];
  /** Duración de cada franja (min). 0 con `hourList`. */
  hourStep?: number;
  /** Horas sueltas elegidas a mano en vez de franjas periódicas: se votan instantes, sin duración. */
  hourList?: boolean;
  /** Con `hourList`: horas sueltas de cada día (pueden ser distintas entre días). Clave = día de `slots`. */
  hoursByDay?: Record<string, string[]>;
  options?: PollOption[];
  anonymous?: boolean;
  tiebreak?: Tiebreak | null;
  ownerUid: string;
  /** Administradores nombrados por el creador (uids): gestionan la votación como él, salvo eliminarla y
   *  nombrar o quitar administradores. */
  admins?: string[];
  /** Si el creador se fue (salió o eliminó su cuenta): su uid y el nombre sin dueño con el que se quedó. Quien la
   *  gestiona ahora (ownerUid) es su «Delegado», con todos los poderes del creador. */
  founder?: string;
  founderName?: string;
  ownerName?: string;
  createdAt?: number;
  closed?: boolean;
  /**
   * Plazo para votar, en milisegundos (`Date.now()`). Pasado el plazo, la app no admite votos aunque `closed`
   * siga false. 0 o sin campo: sin plazo. Lo hace cumplir la interfaz, no las reglas de Firestore.
   */
  deadline?: number;
  // ----- Quién puede unirse (votaciones creadas desde que existe esta opción) -----
  /** Tope de personas, contando al creador (como mucho MAX_PEOPLE). Si falta, la votación es antigua y no tiene tope. */
  maxPeople?: number;
  /** Personas dentro (aceptadas o pendientes), contando al creador. Las reglas obligan a sumar/restar 1 al entrar/salir. */
  members?: number;
  /** Quien entra queda pendiente hasta que el creador le acepte. */
  approval?: boolean;
  /** Solo pueden entrar los correos de `polls/{id}/private/access` (que solo lee el creador). */
  emailsOnly?: boolean;
}

/** Documento `polls/{id}/private/access`: correos permitidos (en minúsculas). Solo lo lee y escribe el creador. */
export interface PollAccess {
  emails: string[];
}

export interface Poll extends PollData {
  id: string;
}

/** Documento `polls/{id}/votes/{uid}`. */
export interface Vote {
  name?: string;
  photo?: string;
  picks?: string[];
  tb?: { id: number; pick: string } | null;
  seenAt?: number;
  updatedAt?: number;
  /** Solo en votaciones con aprobación: pendiente o rechazado. Sin campo = aceptado. */
  status?: "pending" | "rejected";
  /** Se fue (salió de la votación ya cerrada o eliminó su cuenta): el voto se queda con un nombre sin dueño. No
   *  hereda la votación ni se le avisa. Si vuelve a entrar, recupera su nombre y deja de contar como ido. */
  gone?: boolean;
}

/** Documento `polls/{id}/chat/{msgId}`. La foto no se guarda: sale del voto del autor. */
export interface ChatMessage {
  id: string;
  uid: string;
  name: string;
  text: string;
  at: number;
}

export type MemberStatus = "accepted" | "pending" | "rejected";

export type Votes = Record<string, Vote>;

/** Documento `users/{uid}/polls/{pollId}`. */
export interface LibraryEntry {
  title?: string;
  type?: PollType;
  role?: "owner" | "participant";
  ownerName?: string;
  groupId?: string | null;
  addedAt?: number;
  archived?: boolean; // archivada: sale del panel principal y del menú lateral, pero conserva su grupo
  /** Fecha (`at`) del último mensaje del chat que ha visto: lo posterior de otros cuenta como no leído. */
  chatSeenAt?: number;
}

export interface Group {
  name: string;
  createdAt?: number;
}

export interface Library {
  polls: Record<string, LibraryEntry>;
  groups: Record<string, Group>;
}

/** Qué avisos quiere recibir. Sin el campo, o sin alguna clave, se le avisa de todo. */
export interface NotifyPrefs {
  /** Alguien ha votado en una votación suya. */
  votes?: boolean;
  /** Se cierra, se reabre, hay desempate o se acaba el plazo. */
  state?: boolean;
  /** Le han aceptado, o alguien quiere entrar en una votación suya. */
  members?: boolean;
}

/** Documento `users/{uid}` (privado). */
export interface Profile {
  name?: string;
  photo?: string;  // imagen de perfil (128 px en base64, URL de Google o vacía)
  thumb?: string;  // miniatura que se copia en los votos (64 px), para que pesen poco
  notify?: NotifyPrefs;
  updatedAt?: number;
}

/** Usuario tal como lo da el proveedor de sesión. */
export interface AuthUser {
  uid: string;
  name: string;
  photo: string;
  /** Correo de la cuenta (en minúsculas), para las votaciones solo con correos permitidos. */
  email: string;
  /** Ha entrado sin cuenta (sesión anónima): solo puede votar en las votaciones abiertas. */
  anon: boolean;
  /** La sesión trae nombre (las cuentas nuevas por enlace al correo no). */
  hasName: boolean;
}

/** Usuario de la app: datos de sesión + perfil elegido por él. */
export interface User extends AuthUser {
  googlePhoto: string;
  thumb: string; // miniatura de `photo`: es la que se guarda en cada voto
  /** Ni la sesión ni el perfil tienen nombre: NameDialog lo pide. */
  needsName?: boolean;
}

/** Lo que se copia del usuario en cada voto (nombre y miniatura). */
export interface Participant {
  uid: string;
  name: string;
  photo: string;
}

export type Unsubscribe = () => void;
export type ErrorCb = (e: unknown) => void;

export interface Store {
  mode: "firebase" | "demo";
  onAuth(cb: (u: AuthUser | null) => void): Unsubscribe;
  /** `anonymous`: entra sin cuenta con el nombre dado; `name`: nombre del modo demo. */
  signIn(opts?: { name?: string; anonymous?: boolean }): Promise<unknown>;
  /** Convierte una sesión sin cuenta en cuenta de Google conservando el uid (y con él los votos). */
  linkGoogle(): Promise<void>;
  /** Crea la clave de acceso de la cuenta sin registro (anula la anterior). Devuelve «XXXX-XXXX-XXXX-XXXX-XXXX». */
  createAccessKey(): Promise<string>;
  /** Vuelve a entrar en una cuenta sin registro con su clave de acceso. */
  signInWithKey(key: string): Promise<void>;
  /** Manda el enlace para entrar con el correo (o, con una cuenta sin registro abierta, para guardarla en él). */
  sendEmailLink(email: string): Promise<void>;
  /** Correo al que se mandó el último enlace desde este dispositivo ("" si no hay). */
  pendingLinkEmail(): string;
  /** Si la dirección es un enlace de entrada por correo. */
  isEmailLink(url: string): boolean;
  /**
   * Completa el enlace del correo. Con una cuenta sin registro abierta, se guarda en ese correo (mismo uid, se quita
   * la clave) y devuelve `linked`; si no, se entra con él.
   */
  completeEmailLink(email: string, url: string): Promise<{ linked: boolean }>;
  /** Nombre de la sesión (cuentas nuevas por correo, que no traen nombre). */
  setDisplayName(name: string): Promise<void>;
  /**
   * Antes de eliminar la cuenta: Firebase exige haber entrado hace poco. Con Google se vuelve a pedir la cuenta
   * (ventana de Google); con correo o clave, si hace rato que se entró, hay que salir y volver a entrar ("relogin").
   */
  prepareDeleteAccount(): Promise<"ok" | "relogin">;
  /**
   * Elimina la cuenta: sale de cada votación de su lista como con leavePoll y luego se borran su perfil, su lista,
   * sus grupos y la cuenta de inicio de sesión.
   */
  deleteAccount(uid: string): Promise<void>;
  /**
   * Sale de la votación y la quita de su lista. Pasa a un nombre sin dueño (ghostName, sin foto) en sus mensajes del
   * chat y, si la creó, en «Creador». Sus votos: abierta o con un desempate abierto, se borran y su plaza queda
   * libre; cerrada, se quedan con ese nombre (ver keepsVotesOnLeave). Si era el creador, la votación pasa a un
   * administrador o participante al azar (o se borra si no queda nadie). `dropGroupId`: grupo que queda vacío y se
   * borra a la vez.
   */
  leavePoll(id: string, uid: string, dropGroupId?: string | null): Promise<void>;
  signOut(): Promise<void>;

  /** Crea la votación y, si se dan, guarda aparte sus correos permitidos. */
  createPoll(data: PollData, access?: PollAccess | null): Promise<string>;
  /** Correos permitidos (solo el creador puede leerlos). */
  getAccess(id: string): Promise<PollAccess | null>;
  setAccess(id: string, access: PollAccess): Promise<void>;
  getPoll(id: string): Promise<Poll | null>;
  updatePoll(id: string, patch: Partial<PollData>): Promise<void>;
  /** Borra la votación para todos. `dropGroupId`: grupo que queda vacío y se borra a la vez. */
  deletePoll(id: string, uid: string, dropGroupId?: string | null): Promise<void>;
  watchPoll(id: string, cb: (p: Poll | null) => void, onErr?: ErrorCb): Unsubscribe;

  watchVotes(id: string, cb: (v: Votes) => void, onErr?: ErrorCb): Unsubscribe;
  /** Solo el voto propio: lo que puede leer quien aún no ha sido aceptado en una votación restringida. */
  watchVote(id: string, uid: string, cb: (v: Vote | null) => void, onErr?: ErrorCb): Unsubscribe;
  /** El voto propio, una vez (null si no participa). */
  getVote(id: string, uid: string): Promise<Vote | null>;
  /**
   * Registra al usuario como participante sin tocar sus votos. Si es nuevo en una votación con tope (`counted`),
   * entra a la vez que se suma 1 al contador de la votación. `pending`: entra pendiente de aprobación.
   */
  joinPoll(id: string, user: Participant, opts?: { isNew?: boolean; counted?: boolean; pending?: boolean }): Promise<void>;
  /** El creador acepta, rechaza o vuelve a dejar pendiente a alguien (y ajusta el contador si hace falta). */
  setMemberStatus(id: string, uid: string, status: MemberStatus, opts: { from: MemberStatus; counted: boolean }): Promise<void>;
  saveVote(id: string, uid: string, data: Vote): Promise<void>;
  saveTiebreakVote(id: string, uid: string, data: Vote): Promise<void>;
  updateParticipant(id: string, uid: string, data: Vote): Promise<void>;

  /** Chat de la votación: los últimos CHAT_LIMIT mensajes, del más antiguo al más nuevo. */
  watchChat(id: string, cb: (msgs: ChatMessage[]) => void, onErr?: ErrorCb): Unsubscribe;
  sendChat(id: string, msg: Omit<ChatMessage, "id">): Promise<void>;

  getProfile(uid: string): Promise<Profile | null>;
  saveProfile(uid: string, data: Profile): Promise<void>;

  /** Guarda el dispositivo al que mandar los avisos, en `users/{uid}/tokens/{token}`. */
  savePushToken(uid: string, token: string, data: { platform: string; updatedAt: number }): Promise<void>;
  removePushToken(uid: string, token: string): Promise<void>;

  watchLibrary(uid: string, cb: (l: Library) => void, onErr?: ErrorCb): Unsubscribe;
  saveLibraryEntry(uid: string, pollId: string, data: Partial<LibraryEntry>): Promise<void>;
  /** Quita la votación de la lista del usuario. `dropGroupId`: grupo que queda vacío y se borra a la vez. */
  removeLibraryEntry(uid: string, pollId: string, dropGroupId?: string | null): Promise<void>;
  createGroup(uid: string, name: string): Promise<string>;
  renameGroup(uid: string, gid: string, name: string): Promise<void>;
  deleteGroup(uid: string, gid: string): Promise<void>;
}
