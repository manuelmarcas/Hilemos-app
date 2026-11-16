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
  hours?: string[];
  hourStep?: number;
  options?: PollOption[];
  anonymous?: boolean;
  tiebreak?: Tiebreak | null;
  ownerUid: string;
  ownerName?: string;
  createdAt?: number;
  closed?: boolean;
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
}

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
}

export interface Group {
  name: string;
  createdAt?: number;
}

export interface Library {
  polls: Record<string, LibraryEntry>;
  groups: Record<string, Group>;
}

/** Documento `users/{uid}` (privado). */
export interface Profile {
  name?: string;
  photo?: string;  // imagen de perfil (128 px en base64, URL de Google o vacía)
  thumb?: string;  // miniatura que se copia en los votos (64 px), para que pesen poco
  hideRemoveWarning?: boolean; // ha marcado "no volver a mostrar" en el aviso de eliminar de su lista
  updatedAt?: number;
}

/** Usuario tal como lo da el proveedor de sesión. */
export interface AuthUser {
  uid: string;
  name: string;
  photo: string;
}

/** Usuario de la app: datos de sesión + perfil elegido por él. */
export interface User extends AuthUser {
  googlePhoto: string;
  thumb: string; // miniatura de `photo`: es la que se guarda en cada voto
  hideRemoveWarning: boolean;
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
  signIn(opts?: { name: string }): Promise<unknown>;
  signOut(): Promise<void>;

  createPoll(data: PollData): Promise<string>;
  getPoll(id: string): Promise<Poll | null>;
  updatePoll(id: string, patch: Partial<PollData>): Promise<void>;
  /** Borra la votación para todos. `dropGroupId`: grupo que queda vacío y se borra a la vez. */
  deletePoll(id: string, uid: string, dropGroupId?: string | null): Promise<void>;
  watchPoll(id: string, cb: (p: Poll | null) => void, onErr?: ErrorCb): Unsubscribe;

  watchVotes(id: string, cb: (v: Votes) => void, onErr?: ErrorCb): Unsubscribe;
  joinPoll(id: string, user: Participant): Promise<void>;
  saveVote(id: string, uid: string, data: Vote): Promise<void>;
  saveTiebreakVote(id: string, uid: string, data: Vote): Promise<void>;
  updateParticipant(id: string, uid: string, data: Vote): Promise<void>;

  getProfile(uid: string): Promise<Profile | null>;
  saveProfile(uid: string, data: Profile): Promise<void>;

  watchLibrary(uid: string, cb: (l: Library) => void, onErr?: ErrorCb): Unsubscribe;
  saveLibraryEntry(uid: string, pollId: string, data: Partial<LibraryEntry>): Promise<void>;
  /** Quita la votación de la lista del usuario. `dropGroupId`: grupo que queda vacío y se borra a la vez. */
  removeLibraryEntry(uid: string, pollId: string, dropGroupId?: string | null): Promise<void>;
  /** Vuelve a crear un grupo con su id (para deshacer). */
  restoreGroup(uid: string, gid: string, data: Group): Promise<void>;
  createGroup(uid: string, name: string): Promise<string>;
  renameGroup(uid: string, gid: string, name: string): Promise<void>;
  deleteGroup(uid: string, gid: string): Promise<void>;
}
