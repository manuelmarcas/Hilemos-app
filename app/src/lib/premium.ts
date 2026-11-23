// Qué funciones serán premium y por qué (docs/funcionalidades-y-planes.md, §3, §8 y §9). Son los textos de la ventana
// que se abre al tocar una etiqueta «Premium» (components/Premium.tsx). De momento todo es gratis para todos.
import { FREE_OPEN, FREE_PEOPLE, MAX_PEOPLE } from "./model";

export type PremiumFeature =
  | "deadline" | "approval" | "emails" | "people" | "admins" | "duplicate" | "export" | "reopen" | "open";

export interface PremiumInfo {
  title: string;
  /** Qué hace. */
  what: string;
  /** Por qué es premium (y qué sigue siendo gratis). */
  why: string;
}

export const PREMIUM_INFO: Record<PremiumFeature, PremiumInfo> = {
  deadline: {
    title: "Plazo para votar",
    what: "La votación deja de admitir votos sola, el día y a la hora que elijas.",
    why: "Es una herramienta para organizar con fecha límite, sobre todo eventos. Quitar un plazo que ya está puesto seguirá siendo gratis.",
  },
  approval: {
    title: "Con tu aprobación",
    what: "Decides quién entra: quien abre el enlace espera a que le aceptes para poder votar.",
    why: "Da control sobre quién participa, algo que necesitan sobre todo los grupos grandes, las asociaciones y los eventos abiertos. Aceptar o rechazar a quien ya lo pidió seguirá siendo gratis.",
  },
  emails: {
    title: "Solo estos correos",
    what: "Votación privada: solo entran las cuentas con los correos de tu lista.",
    why: "Como la aprobación, es control sobre quién participa. Añadir correos a una lista que ya existe seguirá siendo gratis.",
  },
  people: {
    title: `Más de ${FREE_PEOPLE} personas`,
    what: `Gratis, hasta ${FREE_PEOPLE} personas por votación; con premium, hasta ${MAX_PEOPLE}.`,
    why: "Las votaciones grandes son las que más cuesta mantener: cada persona lee la votación, los votos y el chat, y cada cambio se le manda al momento. Un grupo de amigos casi nunca pasa de 20.",
  },
  admins: {
    title: "Nombrar administradores",
    what: "Otras personas gestionan la votación contigo: aceptar, cerrar, editar, desempatar…",
    why: "Está pensado para organizar en equipo (clubes, asociaciones, empresas). Expulsar a alguien y quitar administradores seguirán siendo gratis.",
  },
  duplicate: {
    title: "Duplicar",
    what: "Crea una votación nueva con los mismos ajustes, opciones y descripción.",
    why: "Ahorra tiempo a quien organiza a menudo. Crear una votación desde cero seguirá siendo gratis.",
  },
  export: {
    title: "Excel y PDF",
    what: "Informes con formato para presentar o imprimir: la clasificación, quién votó qué y los participantes.",
    why: "Son para quien tiene que rendir cuentas (asociaciones, empresas). Exportar en CSV, para guardar la votación, seguirá siendo gratis.",
  },
  reopen: {
    title: "Reabrir una votación con funciones premium",
    what: `Volver a abrir una votación que usa algo premium (plazo, aprobación, solo correos, administradores o más de ${FREE_PEOPLE} personas).`,
    why: "Así una votación premium no se puede reutilizar una y otra vez cambiándole el título y las fechas. Las votaciones sin nada premium se reabrirán gratis.",
  },
  open: {
    title: `Más de ${FREE_OPEN} votaciones abiertas a la vez`,
    what: `Gratis, hasta ${FREE_OPEN} votaciones abiertas a la vez que gestiones tú; las cerradas no cuentan. Con premium, hasta 50.`,
    why: "No castiga a quien organiza de vez en cuando: basta con cerrar una para abrir otra. Las votaciones en las que solo participas no cuentan.",
  },
};

/** Lo que es gratis siempre, para que quede claro que premium no toca lo básico. */
export const ALWAYS_FREE = "Votar, ver los resultados, desempatar, el chat, los grupos y compartir son y seguirán siendo gratis.";

/** El aviso del lanzamiento. */
export const LAUNCH_FREE = "Durante el lanzamiento de Hilemos, todo es gratis para todos. Cuando llegue premium lo avisaremos con tiempo, y las votaciones que ya tengas seguirán funcionando.";
