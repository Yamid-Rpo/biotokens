export type Sector =
  | "forestal"
  | "agricola"
  | "energia_limpia"
  | "movilidad_electrica"
  | "recuperacion_agua"
  | "transformacion_residuos"
  | "captura_co2";

export type RecordUnit =
  | "m2_reforestado"
  | "m2_agricola"
  | "kwh_renovable"
  | "kg_co2_reducido"
  | "l_agua_recuperada"
  | "kg_residuos_transformados";

export type ProjectStatus =
  | "borrador"
  | "en_revision"
  | "verificado"
  | "activo"
  | "rechazado";

export type Lang = "es" | "en";

export interface SectorInfo {
  es: string;
  en: string;
  unit: RecordUnit;
  assetCode: string;
  sdgs: number[];
}

export const SECTORS: Record<Sector, SectorInfo> = {
  forestal: {
    es: "Forestal",
    en: "Forestry",
    unit: "m2_reforestado",
    assetCode: "BIOFOR",
    sdgs: [13, 15],
  },
  agricola: {
    es: "Agrícola",
    en: "Agriculture",
    unit: "m2_agricola",
    assetCode: "BIOAGR",
    sdgs: [2, 12, 15],
  },
  energia_limpia: {
    es: "Energía limpia",
    en: "Clean energy",
    unit: "kwh_renovable",
    assetCode: "BIOKWH",
    sdgs: [7, 13],
  },
  movilidad_electrica: {
    es: "Movilidad eléctrica",
    en: "Electric mobility",
    unit: "kg_co2_reducido",
    assetCode: "BIOCO2",
    sdgs: [11, 13],
  },
  recuperacion_agua: {
    es: "Recuperación de agua",
    en: "Water recovery",
    unit: "l_agua_recuperada",
    assetCode: "BIOH2O",
    sdgs: [6, 12],
  },
  transformacion_residuos: {
    es: "Transformación de residuos",
    en: "Waste transformation",
    unit: "kg_residuos_transformados",
    assetCode: "BIORES",
    sdgs: [11, 12],
  },
  captura_co2: {
    es: "Captura de CO₂",
    en: "CO₂ capture",
    unit: "kg_co2_reducido",
    assetCode: "BIOCO2",
    sdgs: [13],
  },
};

export const UNIT_LABEL: Record<RecordUnit, { es: string; en: string }> = {
  m2_reforestado: { es: "m² reforestado", en: "m² reforested" },
  m2_agricola: { es: "m² agrícola sostenible", en: "m² sustainable farmland" },
  kwh_renovable: { es: "kWh renovable", en: "renewable kWh" },
  kg_co2_reducido: { es: "kg CO₂ reducido", en: "kg CO₂ reduced" },
  l_agua_recuperada: { es: "L de agua recuperada", en: "L of recovered water" },
  kg_residuos_transformados: { es: "kg residuos transformados", en: "kg waste transformed" },
};

export const SDG_INFO: Record<number, { es: string; en: string; color: string }> = {
  2: { es: "Hambre cero", en: "Zero hunger", color: "#DDA63A" },
  6: { es: "Agua limpia y saneamiento", en: "Clean water and sanitation", color: "#26BDE2" },
  7: { es: "Energía asequible y no contaminante", en: "Affordable and clean energy", color: "#FCC30B" },
  11: { es: "Ciudades y comunidades sostenibles", en: "Sustainable cities and communities", color: "#FD9D24" },
  12: { es: "Producción y consumo responsables", en: "Responsible consumption and production", color: "#BF8B2E" },
  13: { es: "Acción por el clima", en: "Climate action", color: "#3F7E44" },
  15: { es: "Vida de ecosistemas terrestres", en: "Life on land", color: "#56C02B" },
};
