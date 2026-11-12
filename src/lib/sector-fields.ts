import type { Sector } from "@/lib/sectors";

export interface SectorField { key: string; label: string; hint?: string }
export interface SectorFieldSet { project: SectorField[]; current: SectorField[] }

const f = (key: string, label: string, hint?: string): SectorField => ({ key, label, hint });
const SANIDAD = "Plagas, hongos, enfermedades, daños por viento o animales, déficit nutricional";
const CLIMA = "Temperatura, lluvia, viento, radiación";
const RED = "Eficiencia, consumo, calidad de energía";

export const SECTOR_FIELDS: Record<Sector, SectorFieldSet> = {
  energia_limpia: {
    project: [
      f("tipo", "Tipo", "Panel solar, generador eólico, pila de hidrógeno"),
      f("capacidad", "Capacidad del generador", "Potencia nominal, voltaje, corriente"),
      f("almacenamiento", "Almacenamiento", "Tipo de batería, capacidad"),
      f("inversores", "Inversores", "110 V, 220 V"),
      f("fecha_instalacion", "Fecha de instalación"),
      f("gps", "Ubicación GPS", "Coordenadas"),
    ],
    current: [
      f("generacion", "Generación energética", "Generación diaria (kWh)"),
      f("meteorologia", "Meteorología", "Sol, viento, lluvia, temperatura"),
      f("estado_activos", "Estado de activos", "Paneles, turbinas, pilas de hidrógeno, baterías"),
      f("energia_almacenada", "Almacenamiento energético", "Energía almacenada (kWh)"),
      f("red", "Red eléctrica", RED),
    ],
  },
  forestal: {
    project: [
      f("id_unico", "ID único", "QR, RFID o NFC"),
      f("especie", "Especie", "Tipo"),
      f("fecha_siembra", "Fecha de siembra"),
      f("gps", "Ubicación GPS", "Coordenadas"),
      f("procedencia", "Procedencia de la plántula", "Semillas"),
    ],
    current: [
      f("inventario", "Inventario forestal", "Cada árbol"),
      f("crecimiento", "Crecimiento del árbol", "Altura, DAP, diámetro de copa, volumen, biomasa, captura de carbono, supervivencia (%)"),
      f("suelo", "Suelo", "Humedad, pH, fertilidad"),
      f("clima", "Clima", CLIMA),
      f("sanidad", "Sanidad", SANIDAD),
      f("operaciones", "Operaciones", "Siembra, fertilización, poda"),
    ],
  },
  agricola: {
    project: [
      f("cultivo", "Tipo de cultivo", "Papa, maíz, café, cacao, tomate, aguacate, piña…"),
      f("fecha_siembra", "Fecha de siembra"),
      f("gps", "Ubicación GPS", "Coordenadas"),
      f("procedencia", "Procedencia de la plántula", "Semillas"),
      f("historial", "Historial del lote"),
    ],
    current: [
      f("crecimiento", "Crecimiento del cultivo", "Altura, diámetro del tallo, cobertura, floración, fructificación"),
      f("suelo", "Suelo", "Humedad, pH, NPK, CE"),
      f("clima", "Clima", CLIMA),
      f("riego", "Riego", "Caudal, consumo, presión"),
      f("sanidad", "Sanidad", SANIDAD),
      f("operaciones", "Operaciones agrícolas", "Siembra, fertilización, cosecha"),
    ],
  },
  movilidad_electrica: {
    project: [
      f("marca", "Marca"), f("modelo", "Modelo"), f("vin", "VIN"),
      f("bateria_ah", "Capacidad de batería", "Ah"), f("tipo_bateria", "Tipo de batería"),
      f("potencia_motor", "Potencia del motor"), f("fecha_adquisicion", "Fecha de adquisición"),
    ],
    current: [
      f("vehiculos", "Vehículos eléctricos", "Estado, ubicación, rendimiento"),
      f("baterias", "Baterías", "Energía almacenada (kWh)"),
      f("red", "Red eléctrica", RED),
      f("rutas", "Rutas y logística", "Kilómetros recorridos"),
    ],
  },
  recuperacion_agua: {
    project: [
      f("captacion", "Captación", "Agua lluvia, agua de lavado"),
      f("capacidad", "Capacidad de almacenamiento", "Tanques"),
      f("tratamiento", "Sistema de limpieza o tratamiento", "Tecnología implementada"),
      f("redistribucion", "Redistribución", "Reutilización o nuevos usos"),
    ],
    current: [
      f("almacenamiento", "Almacenamiento", "Litros"),
      f("calidad", "Calidad del agua", "pH final"),
      f("redistribucion_actual", "Redistribución", "Eficiencia, pérdidas"),
      f("mantenimiento", "Operaciones de mantenimiento", "Limpieza de tanques y filtros"),
    ],
  },
  transformacion_residuos: {
    project: [
      f("tipo_residuo", "Tipo de residuo"), f("generador", "Quién lo genera"),
      f("peso_entrada", "Cuánto pesa", "Entrada"),
      f("proceso", "Proceso de transformación", "Tecnología aplicada"),
      f("destino", "A qué se destina"),
    ],
    current: [
      f("transformados", "Residuos transformados", "Cantidad diaria procesada"),
      f("estado_proceso", "Proceso", "Estado del proceso"),
      f("producto_final", "Producto final"),
    ],
  },
  captura_co2: {
    project: [
      f("tipo_emisiones", "Tipo de emisiones"),
      f("origen", "Origen de las emisiones", "Quién emite"),
      f("tecnologia", "Árbol de transformación de CO₂", "Tecnología aplicada"),
    ],
    current: [
      f("emisiones", "Emisiones generadas", "Cantidad diaria"),
      f("origen_actual", "Origen de las emisiones", "Quién emite"),
      f("estado_proceso", "Proceso", "Estado del proceso"),
      f("producto_final", "Producto final", "Composición o estado final"),
    ],
  },
};
