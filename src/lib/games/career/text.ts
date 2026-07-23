// ╔══════════════════════════════════════════════════════════════════╗
// ║  Todos los textos del Simulador de Carrera                         ║
// ║                                                                    ║
// ║  Igual que en el original, cada opción enseña sus consecuencias y  ║
// ║  su probabilidad antes de pulsarla: el juego no esconde los dados, ║
// ║  y por eso las decisiones se sienten decisiones.                   ║
// ║                                                                    ║
// ║  Los huecos {así} los rellena `fillPlaceholders`.                  ║
// ╚══════════════════════════════════════════════════════════════════╝
import type { Award, DecisionKind, SquadRole, Trophy } from "./types";

export interface OutcomeText {
  /** Probabilidad en tanto por ciento, si el resultado es aleatorio. */
  probability?: number;
  text: string;
}

export interface OptionText {
  label: string;
  positive?: OutcomeText;
  negative?: OutcomeText;
  /** Cuando la opción no depende del azar. */
  certain?: string;
}

export interface EventText {
  title: string;
  description: string;
  options: Record<string, OptionText>;
}

/** Variantes: mismo dilema contado de otra forma y con otros números. */
type EventTextMap = Record<string, EventText & { variants?: Record<string, EventText> }>;

export const EVENT_TEXT: EventTextMap = {
  training_extra: {
    title: "Entrenamiento extra",
    description:
      "Rutina intensa de pretemporada: puedes mejorar rápido, pero te arriesgas a una lesión.",
    options: {
      accept: {
        label: "Aceptar",
        positive: { probability: 70, text: "+3 de media" },
        negative: { probability: 30, text: "−2 de media" },
      },
      reject: { label: "Priorizar el descanso", certain: "Sin cambios" },
    },
    variants: {
      preseason_camp: {
        title: "Concentración extra",
        description:
          "Una concentración especial puede potenciarte, pero el esfuerzo también puede pasarte factura.",
        options: {
          accept: {
            label: "Hacerla",
            positive: { probability: 65, text: "+4 de media" },
            negative: { probability: 35, text: "−3 de media" },
          },
          reject: { label: "Preparación habitual", certain: "Sin cambios" },
        },
      },
    },
  },

  personal_coach: {
    title: "Entrenador personal",
    description: "Un preparador te propone cambiar tu técnica. Puede salir muy bien o muy mal.",
    options: {
      accept: {
        label: "Cambiar la técnica",
        positive: { probability: 50, text: "+2 de media, para siempre" },
        negative: { probability: 50, text: "−2 de media, para siempre" },
      },
      reject: { label: "Mantener tu técnica", certain: "Sin cambios" },
    },
    variants: {
      nutrition_plan: {
        title: "Plan de alimentación",
        description:
          "Un nutricionista propone ajustar tu dieta. Puede mejorar tu rendimiento o sentarte fatal.",
        options: {
          accept: {
            label: "Seguir el plan",
            positive: { probability: 60, text: "+3 de media, para siempre" },
            negative: { probability: 40, text: "−2 de media, para siempre" },
          },
          reject: { label: "Mantener tu dieta", certain: "Sin cambios" },
        },
      },
    },
  },

  mysterious_substance: {
    title: "Sustancia misteriosa",
    description:
      "El médico del club te ofrece un suplemento que mejora tu rendimiento. Si sale en el antidopaje, te suspenden.",
    options: {
      consume: {
        label: "Consumir",
        positive: { probability: 75, text: "+5 de media" },
        negative: { probability: 25, text: "Suspensión: temporada perdida" },
      },
      reject: { label: "Rechazar", certain: "Sin cambios" },
    },
  },

  season_load: {
    title: "Carga de la temporada",
    description: "Vienes de una temporada exigente. ¿Subes la carga o cuidas el físico?",
    options: {
      accept: {
        label: "Carga alta",
        positive: { probability: 70, text: "Titular" },
        negative: { probability: 30, text: "Lesión: al banquillo" },
      },
      stay_calm: { label: "Bajar la carga", certain: "Bajan tus minutos" },
    },
    variants: {
      double_session: {
        title: "Doble sesión",
        description: "Dos entrenamientos al día para dar un salto de rendimiento.",
        options: {
          accept: {
            label: "Entrenar a fondo",
            positive: { probability: 65, text: "Titular" },
            negative: { probability: 35, text: "Lesión: al banquillo" },
          },
          stay_calm: { label: "Bajar la carga", certain: "Menos minutos" },
        },
      },
    },
  },

  position_change: {
    title: "Cambio de posición",
    description: "El entrenador te necesita para cubrir otro puesto.",
    options: {
      accept: {
        label: "Aceptar",
        positive: { text: "Titular todo el tramo" },
        negative: { text: "−2 de media mientras te adaptas" },
      },
      reject: { label: "Rechazar", negative: { text: "Menos minutos" } },
    },
  },

  position_competition: {
    title: "Competencia por el puesto",
    description: "El club ficha a otro jugador para pelearte el sitio.",
    options: {
      compete: {
        label: "Competir",
        positive: { probability: 50, text: "Titular" },
        negative: { probability: 50, text: "A la rotación baja" },
      },
    },
  },

  unexpected_prospect: {
    title: "Promesa inesperada",
    description: "Un juvenil viene a por tu puesto. Puedes guiarlo o buscar una salida.",
    options: {
      mentor: {
        label: "Ser su mentor",
        positive: { text: "Muchas más opciones de ganar títulos" },
        negative: { text: "Bajan tu rol y tus minutos" },
      },
      search_exit: { label: "Buscar una salida en {team}" },
    },
  },

  club_priority: {
    title: "Prioridad del club",
    description: "El equipo te pide elegir entre pelear la liga o la copa internacional.",
    options: {
      prioritize_league: {
        label: "Priorizar la liga",
        positive: { text: "El doble de opciones de ganar la liga" },
        negative: { text: "La mitad de opciones en la copa internacional" },
      },
      prioritize_continental: {
        label: "Priorizar la copa internacional",
        positive: { text: "El doble de opciones en la copa internacional" },
        negative: { text: "La mitad de opciones de ganar la liga" },
      },
    },
  },

  rival_offer: {
    title: "Oferta del rival",
    description: "El {rival} quiere ficharte y montar un superequipo. ¿Aceptas el reto?",
    options: {
      accept: {
        label: "Irte al {rival}",
        positive: { text: "Muchas más opciones de ganar títulos" },
        negative: { text: "Tendrás menos minutos" },
      },
      reject: { label: "Quedarte en {team}", certain: "Sigues como estás" },
    },
  },

  club_crisis: {
    title: "Crisis en el club",
    description: "El equipo atraviesa una mala etapa y otro club viene a buscarte.",
    options: {
      stay_and_fight: {
        label: "Quedarte a pelearla",
        negative: { text: "Casi ninguna opción de ganar nada" },
      },
      search_exit: { label: "Salir hacia {team}" },
    },
  },

  fan_backlash: {
    title: "Enfado de la afición",
    description: "La grada está harta de tu rendimiento y empieza a cuestionar tu sitio.",
    options: {
      stay_and_fight: {
        label: "Quedarte a pelearla",
        negative: { text: "−2 de media por la presión, que luego recuperas" },
      },
      search_exit: { label: "Salir del club hacia {team}" },
    },
  },

  return_home: {
    title: "Vuelta a casa",
    description: "Tu familia te pide que vuelvas al país.",
    options: {
      stay_abroad: {
        label: "Quedarte fuera",
        negative: { text: "−5 de media por el disgusto, que luego recuperas" },
      },
      return_home: { label: "Volver a {team}" },
    },
  },

  giant_tattoo: {
    title: "Tatuaje gigante",
    description: "Un estudio te ofrece hacerte un águila enorme en el pecho.",
    options: {
      accept: {
        label: "Aceptar",
        positive: { probability: 70, text: "+2 de media por confianza" },
        negative: { probability: 30, text: "Se infecta: al banquillo" },
      },
      reject: { label: "Rechazar", certain: "No pasa nada" },
    },
  },

  tax_trouble: {
    title: "Problemas con Hacienda en {country}",
    description: "Una inspección fiscal pone en duda tu continuidad en el país.",
    options: {
      stay_and_fight: {
        label: "Quedarte y dar la cara",
        negative: { text: "−3 de media por la distracción, que luego recuperas" },
      },
      search_exit: { label: "Salir hacia {team}" },
    },
  },

  foreign_grandfather: {
    title: "Un abuelo de otro país",
    description:
      "Descubres que tienes un abuelo de {altCountry} y puedes cambiar de selección.",
    options: {
      switch_national_team: {
        label: "Jugar con {altCountry}",
        certain: "Cambias de selección para el resto de tu carrera",
      },
      keep_national_team: { label: "Seguir con {country}", certain: "Mantienes tu selección" },
    },
  },

  finish_high_school: {
    title: "Terminar los estudios",
    description: "Puedes retomar el instituto y sacarte el título mientras juegas.",
    options: {
      accept: {
        label: "Estudiar",
        positive: { text: "+1 de media por madurez" },
        negative: { text: "Menos minutos mientras tanto" },
      },
      reject: { label: "Dejarlo", certain: "Sin cambios" },
    },
  },

  controversial_statement: {
    title: "Declaración polémica",
    description: "Criticas al entrenador en rueda de prensa y el vestuario se tensa.",
    options: {
      apologize: { label: "Pedir disculpas", negative: { text: "Bajan tus minutos" } },
    },
  },

  triumphant_return: {
    title: "Regreso triunfal",
    description: "Tu primer club te propone volver para cerrar tu carrera como titular.",
    options: {},
  },

  club_national_team_conflict: {
    title: "Conflicto club-selección",
    description: "Tu club se niega a dejarte ir con la selección a preparar {tournament}.",
    options: {
      go_anyway: {
        label: "Ir igual",
        positive: { text: "Vas a {tournament}" },
        negative: { text: "Te castigan en el club" },
      },
      comply: {
        label: "Acatar",
        positive: { text: "Tu sitio en el club no se mueve" },
        negative: { text: "Te quedas sin {tournament}" },
      },
    },
  },

  injury_at_peak: {
    title: "Lesión en el peor momento",
    description: "Una lesión amenaza tu camino hacia {championship}. ¿Fuerzas o te cuidas?",
    options: {
      play_injured: {
        label: "Jugar lesionado",
        positive: { probability: 80, text: "Muchas opciones de ganar {championship}" },
        negative: { probability: 20, text: "La lesión empeora: −1 de media" },
      },
      recover: {
        label: "Recuperarte bien",
        positive: { probability: 30, text: "Llegas a tiempo para {championship}" },
        negative: { probability: 70, text: "Te pierdes lo importante" },
      },
    },
  },

  injury: {
    title: "{injury}",
    description: "La recuperación te va a dejar sin ritmo durante este tramo.",
    options: {
      continue: { label: "Empezar la recuperación", negative: { text: "Pierdes media y minutos" } },
    },
  },

  decisive_penalty: {
    title: "Penalti decisivo",
    description: "Te toca definir {championship} desde los once metros. ¿A qué lado?",
    options: {
      left: { label: "A la izquierda", positive: { probability: 50, text: "Gol" } },
      right: { label: "A la derecha", positive: { probability: 50, text: "Gol" } },
    },
  },
};

/** Texto de un evento, con su variante si la tiene. */
export function eventText(eventKey: string, variantKey?: string): EventText {
  const base = EVENT_TEXT[eventKey];
  if (!base) throw new Error(`Sin textos para el evento ${eventKey}`);
  if (variantKey && base.variants?.[variantKey]) return base.variants[variantKey];
  return base;
}

/** Rellena los huecos {así} del texto. */
export function fillPlaceholders(text: string, values: Record<string, string | undefined>): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

// ── Pantallas de decisión ────────────────────────────────────────────

export const DECISION_TEXT: Record<DecisionKind, { title: string; description: string }> = {
  academy_offer: {
    title: "Oferta de cantera",
    description: "Tres clubes te quieren en su fútbol base. Aquí empieza todo.",
  },
  transfer: {
    title: "Mercado de fichajes",
    description: "Han llegado ofertas. Puedes aceptar una o seguir donde estás.",
  },
  loan_offer: {
    title: "Salir cedido",
    description: "Tu club quiere que sumes minutos fuera. ¿Dónde sigues creciendo?",
  },
  post_loan_retained: {
    title: "Vuelta a tu club",
    description: "Vuelves y cuentan contigo. Aun así, tienes ofertas sobre la mesa.",
  },
  post_loan_not_retained: {
    title: "Vuelta a tu club",
    description: "Vuelves, pero no cuentan contigo. Puedes salir otra vez o quedarte a pelearlo.",
  },
  contract_non_renewal: {
    title: "Fin de ciclo",
    description: "Tu club no te renueva. Toca decidir el siguiente paso.",
  },
  career_event: { title: "", description: "" },
};

export const OPTION_LABEL = {
  join: (team: string) => `Fichar por ${team}`,
  loan: (team: string) => `Cesión en ${team}`,
  permanent: (team: string) => `Fichar en propiedad por ${team}`,
  stay: (team: string) => `Seguir en ${team}`,
  retire: "Retirarte",
  retireDescription: "Poner el punto final a tu carrera",
};

// ── Nombres ──────────────────────────────────────────────────────────

export const TROPHY_NAME: Record<Trophy, string> = {
  league: "Liga",
  cup: "Copa nacional",
  continental_primary: "Copa continental",
  continental_secondary: "Segunda copa continental",
  national_continental: "Torneo continental",
  world_cup: "Mundial",
};

export const TROPHY_EMOJI: Record<Trophy, string> = {
  league: "🏆",
  cup: "🥇",
  continental_primary: "🌍",
  continental_secondary: "🥈",
  national_continental: "🌎",
  world_cup: "🌐",
};

export const AWARD_NAME: Record<Award, string> = {
  ballon_dor: "Balón de Oro",
  golden_boot: "Bota de Oro",
  golden_glove: "Guante de Oro",
};

export const AWARD_EMOJI: Record<Award, string> = {
  ballon_dor: "🥇",
  golden_boot: "👟",
  golden_glove: "🧤",
};

export const ROLE_NAME: Record<SquadRole, string> = {
  starter: "Titular",
  high_rotation: "Rotación alta",
  low_rotation: "Rotación baja",
  substitute: "Suplente",
};

/** Valor de mercado en formato corto: "12,5 M €". */
export function formatValue(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const text = millions >= 100 ? Math.round(millions).toString() : millions.toFixed(1).replace(".0", "").replace(".", ",");
    return `${text} M €`;
  }
  if (value >= 1000) return `${Math.round(value / 1000)} mil €`;
  return `${value} €`;
}

/** Puesto en la liga con su ordinal: "3.º". */
export function formatPosition(position: number): string {
  return `${position}.º`;
}
