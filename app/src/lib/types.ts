// Tipos del modelo de datos (ver README: "Modelo de datos (Firestore)").

export type PollType = "hours" | "days" | "weeks" | "months" | "options";

/**
 * Opción de una votación. En las de días, las opciones de cada día (comida, cena…; como mucho MAX_OPTIONS). En las
 * de opciones libres («options»), cada una de las opciones que se votan (restaurante, destino…; como mucho
 * MAX_CHOICES), y sus ids son también las casillas (`slots`).
 */
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

/**
 * Aviso para todos de que el desempate cambió solo porque alguien dejó de participar (lo escribe TiebreakGuard).
 * `solved`: ya no había empate y se quitó el desempate; si no, el desempate `tb` sigue solo entre `n` opciones.
 */
export interface TiebreakNote {
  at: number;
  solved: boolean;
  tb?: number;
  n?: number;
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
  tbNote?: TiebreakNote | null;
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
  // ----- Premium: solo los escribe el servidor (functions/plan.js); las reglas no dejan a la app -----
  /** Desde cuándo la gestiona quien la gestiona ahora (al heredarla). Sin campo: desde que se creó (`createdAt`). */
  ownerSince?: number;
  /** Se cerrará sola en esta fecha (la primera de `autoCloseWhy`). Sin campo: no tiene cuenta atrás. */
  autoCloseAt?: number;
  /** Por qué se cerrará sola y cuándo, por cada motivo: le sobra a quien la gestiona (más abiertas que su límite)
   *  o usa funciones de pago y quien la gestiona no tiene premium. */
  autoCloseWhy?: Partial<Record<AutoCloseReason, number>>;
  /** Fecha de cierre de la que ya se avisó el día antes (para no repetir el aviso). */
  autoCloseWarned?: number;
  /** Cuándo la cerró sola una cuenta atrás (el aviso de cierre dice entonces «se ha cerrado sola»). */
  autoClosedAt?: number;
  /**
   * Hora (`at`) del último mensaje del chat: la apunta el servidor (onChatMessage). «Mis votaciones» la compara con
   * `chatSeenAt` de la biblioteca para el icono de mensajes sin leer. Falta si nunca ha habido mensajes (o son de
   * antes de guardarla).
   */
  chatAt?: number;
  /** Quién escribió el último mensaje del chat (uid; lo apunta el servidor con chatAt): lo tuyo no cuenta como sin leer. */
  chatBy?: string;
}

/** Lo que se cuenta desde el dispositivo para las estadísticas (Store.track). La misma lista, en las reglas (pings). */
export type UsageEvent = "csv" | "xlsx" | "pdf" | "image" | "duplicate";

/** Motivos de la cuenta atrás de una votación (docs/funcionalidades-y-planes.md, §8). */
export type AutoCloseReason = "limit" | "premium";

/**
 * Documento `config/app`: lo que se cambia sin publicar otra versión de la app de Android. Lo escribe solo quien
 * administra Hilemos, desde la consola de Firebase; lo lee cualquiera.
 */
export interface AppConfig {
  /** Versión (versionCode) más antigua de la app de Android que sigue valiendo: con una anterior, pide actualizarla. */
  minBuild?: number;
  /** Aviso para todos, arriba de la página (por ejemplo, el de que llega premium). Cada `id` se cierra una vez. */
  notice?: { id: string; text: string; url?: string } | null;
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
  /** Cuándo entró en la votación (la primera vez; si sale y vuelve, la nueva entrada) o, si estaba pendiente o
   *  expulsado, cuándo le aceptaron o readmitieron. El chat solo le enseña los mensajes desde entonces: lo escrito
   *  mientras estaba fuera no es para él. Sin campo (votos de antes): lo ve todo. */
  joinedAt?: number;
  updatedAt?: number;
  /** Pendiente (solo en votaciones con aprobación) o rechazado. Sin campo = aceptado. */
  status?: "pending" | "rejected";
  /** Rechazado porque un administrador le expulsó de la votación (ya estaba dentro), no porque no se aceptara su
   *  solicitud. Solo con `status: "rejected"`; al volver a admitirle se quita. */
  removed?: boolean;
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
  /** Aviso automático de un cambio en la votación (lo escribe un administrador al editarla). `text` va sin sujeto
   *  («ha añadido el …»): se pinta detrás del nombre de quien lo hizo. */
  sys?: boolean;
  /** Ocultado por quien administra la votación: los demás ven un aviso en su lugar (el texto sigue guardado). */
  hidden?: boolean;
}

export type ReportReason = "ofensivo" | "spam" | "inapropiado" | "otro";

/**
 * Documento `polls/{id}/reports/{msgId}_{uid}`: la denuncia de un mensaje del chat (una por persona y mensaje). Copia
 * el mensaje, por si se oculta o cambia de nombre. La leen quienes administran la votación y la recibe quien modera
 * Hilemos (Cloud Function onReport).
 */
export interface ChatReport {
  id: string;
  msgId: string;
  msgUid: string;
  msgName: string;
  msgText: string;
  by: string;
  byName: string;
  reason: ReportReason;
  comment?: string;
  at: number;
}

/**
 * Documento `polls/{id}/personReports/{targetUid}_{uid}`: la denuncia de una persona de la votación (una por persona
 * denunciada y por quien denuncia), por su nombre, su foto o su comportamiento. Copia el nombre y la foto con los que
 * se la veía, por si los cambia. La leen quienes administran la votación y quien la hizo, y la recibe quien modera
 * Hilemos (Cloud Function onPersonReport).
 */
export interface PersonReport {
  id: string;
  targetUid: string;
  targetName: string;
  /** Su foto (la miniatura del voto o la URL de Google); sin campo si no tenía. */
  targetPhoto?: string;
  by: string;
  byName: string;
  reason: ReportReason;
  comment?: string;
  at: number;
}

/** «Descargar mis datos» (Tu perfil): todo lo que Hilemos guarda de la cuenta, para el archivo JSON. */
export interface MyData {
  exportedAt: string;
  account: { uid: string; name: string; email: string; withoutRegistration: boolean };
  profile: Profile | null;
  groups: Record<string, Group>;
  /** Dispositivos con avisos activados (sin el token, que no le sirve a nadie). */
  devices: { platform?: string; updatedAt?: number }[];
  polls: MyPollData[];
}

/** Lo de una votación de su lista: la votación, su participación, sus mensajes y sus denuncias. */
export interface MyPollData {
  id: string;
  inMyList: LibraryEntry;
  poll: Pick<PollData, "title" | "description" | "type" | "createdAt" | "closed" | "ownerName"> & { iCreatedIt: boolean } | null;
  myVote: Vote | null;
  /** Correo con el que entró (votaciones solo con correos). */
  joinedWithEmail?: string;
  myMessages: { at: number; name: string; text: string }[];
  myReports: Omit<ChatReport, "id">[];
  myPersonReports: Omit<PersonReport, "id">[];
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
  /** Le han aceptado (o readmitido), o alguien quiere entrar en una votación que administra. */
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
  /**
   * Votaciones solo con correos: con qué correo entró cada participante (`polls/{id}/emails/{uid}`). Lo apunta cada
   * uno (`saveMemberEmail`, solo el suyo) y solo lo leen quienes la administran, para expulsar a quien tenía un correo
   * que se quita de la lista. Devuelve uid → correo.
   */
  saveMemberEmail(id: string, uid: string, email: string): Promise<void>;
  getMemberEmails(id: string): Promise<Record<string, string>>;
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
  /**
   * Acepta, rechaza o deja pendiente a alguien (solo administradores). `counted`: la votación tiene tope (el contador
   * baja al rechazar y sube al readmitir). `removed`: al rechazar, se le expulsa de la votación (ya estaba dentro).
   * `dropAdmin`: era administrador y deja de serlo en la misma escritura (solo el creador).
   */
  setMemberStatus(id: string, uid: string, status: MemberStatus,
    opts: { from: MemberStatus; counted: boolean; removed?: boolean; dropAdmin?: boolean }): Promise<void>;
  /**
   * Acepta o rechaza a la vez a varias personas que pidieron entrar (solo administradores, solo pendientes): en un
   * lote (o varios, si son muchas), con el contador de plazas ajustado de una vez (`counted`: la votación tiene tope).
   */
  setPendingStatus(id: string, uids: string[], status: "accepted" | "rejected", opts: { counted: boolean }): Promise<void>;
  saveVote(id: string, uid: string, data: Vote): Promise<void>;
  saveTiebreakVote(id: string, uid: string, data: Vote): Promise<void>;
  updateParticipant(id: string, uid: string, data: Vote): Promise<void>;

  /** Chat de la votación: los últimos CHAT_LIMIT mensajes, del más antiguo al más nuevo. */
  /** Últimos mensajes del chat; con `since`, solo los escritos desde entonces (ver chatSince en model.ts). */
  watchChat(id: string, since: number, cb: (msgs: ChatMessage[]) => void, onErr?: ErrorCb): Unsubscribe;
  sendChat(id: string, msg: Omit<ChatMessage, "id">): Promise<void>;
  /** Denuncia un mensaje ajeno (una vez por mensaje). */
  reportMessage(id: string, report: Omit<ChatReport, "id">): Promise<void>;
  /** Denuncias de la votación (solo quienes la administran). */
  watchReports(id: string, cb: (reports: ChatReport[]) => void, onErr?: ErrorCb): Unsubscribe;
  /** Oculta un mensaje o lo vuelve a mostrar (solo quienes administran la votación). */
  setMessageHidden(id: string, msgId: string, hidden: boolean): Promise<void>;
  /** Denuncia a otra persona de la votación (una vez por persona). */
  reportPerson(id: string, report: Omit<PersonReport, "id">): Promise<void>;
  /**
   * Lo que ha denunciado `uid` en la votación: ids de los mensajes y uids de las personas. Para marcarlos como ya
   * denunciados (cada uno solo puede denunciar una vez lo mismo). Las reglas dejan leer a cada uno las suyas.
   */
  watchMyReports(id: string, uid: string, cb: (r: { messages: Set<string>; people: Set<string> }) => void, onErr?: ErrorCb): Unsubscribe;
  /** Denuncias de personas de la votación (solo quienes la administran). */
  watchPersonReports(id: string, cb: (reports: PersonReport[]) => void, onErr?: ErrorCb): Unsubscribe;

  /**
   * De las votaciones `pollIds` (las de la lista de quien pregunta), en cuáles está también `uid` (aceptado y sin
   * irse), para «Votaciones en común» en su perfil. Una lectura por votación; las que no se pueden leer no cuentan.
   */
  sharedPolls(uid: string, pollIds: string[]): Promise<string[]>;

  /** Todo lo que se guarda de la cuenta (perfil, lista, grupos, votos, mensajes y denuncias), para descargarlo. */
  exportMyData(user: AuthUser): Promise<MyData>;

  /** `config/app` (versión mínima y aviso para todos); null si no hay o no se puede leer. */
  getAppConfig(): Promise<AppConfig | null>;
  /**
   * Cuenta una vez algo que solo pasa en el dispositivo (exportar, compartir la imagen, duplicar), sin decir quién:
   * `pings/{id}` con el qué y la hora; el servidor lo suma a las estadísticas del día y lo borra. Si falla, nada.
   */
  track(event: UsageEvent): void;

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
