// Datos geográficos simplificados para selección en cascada.
// País → Departamento/Estado/Provincia → Ciudad.

export type GeoCountry = {
  name: string;
  departmentLabel: string; // Etiqueta del nivel intermedio (Departamento, Estado, Provincia, Región)
  departments: Record<string, string[]>;
};

export const GEO: Record<string, GeoCountry> = {
  Colombia: {
    name: "Colombia",
    departmentLabel: "Departamento",
    departments: {
      "Antioquia": ["Medellín", "Bello", "Envigado", "Itagüí", "Rionegro", "Barbosa", "Sabaneta", "La Estrella", "Caldas", "Copacabana", "Girardota", "Apartadó", "Turbo", "Marinilla", "La Ceja", "Guarne", "El Carmen de Viboral", "Santa Fe de Antioquia", "Yarumal", "Caucasia", "Necoclí", "Puerto Berrío", "Sonsón", "Amalfi", "Andes", "Jericó", "Urrao", "Támesis", "Concordia"],
      "Cundinamarca": ["Bogotá", "Soacha", "Chía", "Zipaquirá", "Facatativá"],
      "Valle del Cauca": ["Cali", "Palmira", "Buenaventura", "Tuluá", "Cartago"],
      "Atlántico": ["Barranquilla", "Soledad", "Malambo", "Sabanalarga"],
      "Santander": ["Bucaramanga", "Floridablanca", "Girón", "Piedecuesta"],
      "Bolívar": ["Cartagena", "Magangué", "Turbaco"],
      "Boyacá": ["Tunja", "Duitama", "Sogamoso", "Chiquinquirá"],
      "Nariño": ["Pasto", "Ipiales", "Tumaco"],
      "Cauca": ["Popayán", "Santander de Quilichao", "Puerto Tejada"],
      "Meta": ["Villavicencio", "Acacías", "Granada"],
    },
  },
  México: {
    name: "México",
    departmentLabel: "Estado",
    departments: {
      "Ciudad de México": ["Coyoacán", "Iztapalapa", "Benito Juárez", "Tlalpan"],
      "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Puerto Vallarta"],
      "Nuevo León": ["Monterrey", "San Pedro Garza García", "Apodaca"],
      "Yucatán": ["Mérida", "Valladolid", "Tizimín"],
      "Oaxaca": ["Oaxaca de Juárez", "Huatulco", "Salina Cruz"],
      "Chiapas": ["Tuxtla Gutiérrez", "San Cristóbal de las Casas", "Tapachula"],
      "Quintana Roo": ["Cancún", "Playa del Carmen", "Chetumal", "Tulum"],
    },
  },
  Argentina: {
    name: "Argentina",
    departmentLabel: "Provincia",
    departments: {
      "Buenos Aires": ["La Plata", "Mar del Plata", "Bahía Blanca", "Tandil"],
      "Córdoba": ["Córdoba", "Villa Carlos Paz", "Río Cuarto"],
      "Mendoza": ["Mendoza", "San Rafael", "Godoy Cruz"],
      "Santa Fe": ["Rosario", "Santa Fe", "Rafaela"],
      "Salta": ["Salta", "Tartagal", "Orán"],
      "Misiones": ["Posadas", "Puerto Iguazú", "Oberá"],
    },
  },
  Chile: {
    name: "Chile",
    departmentLabel: "Región",
    departments: {
      "Metropolitana de Santiago": ["Santiago", "Puente Alto", "Maipú"],
      "Valparaíso": ["Valparaíso", "Viña del Mar", "Quilpué"],
      "Biobío": ["Concepción", "Talcahuano", "Chillán"],
      "Los Lagos": ["Puerto Montt", "Osorno", "Castro"],
      "Antofagasta": ["Antofagasta", "Calama", "Tocopilla"],
    },
  },
  Perú: {
    name: "Perú",
    departmentLabel: "Departamento",
    departments: {
      "Lima": ["Lima", "Callao", "Miraflores", "San Isidro"],
      "Cusco": ["Cusco", "Urubamba", "Pisac"],
      "Arequipa": ["Arequipa", "Camaná", "Mollendo"],
      "Piura": ["Piura", "Sullana", "Talara"],
      "Loreto": ["Iquitos", "Yurimaguas", "Nauta"],
    },
  },
  Ecuador: {
    name: "Ecuador",
    departmentLabel: "Provincia",
    departments: {
      "Pichincha": ["Quito", "Cayambe", "Sangolquí"],
      "Guayas": ["Guayaquil", "Durán", "Milagro"],
      "Azuay": ["Cuenca", "Gualaceo", "Paute"],
      "Manabí": ["Portoviejo", "Manta", "Chone"],
      "Galápagos": ["Puerto Ayora", "Puerto Baquerizo Moreno"],
    },
  },
  Bolivia: {
    name: "Bolivia",
    departmentLabel: "Departamento",
    departments: {
      "La Paz": ["La Paz", "El Alto", "Viacha"],
      "Santa Cruz": ["Santa Cruz de la Sierra", "Montero", "Warnes"],
      "Cochabamba": ["Cochabamba", "Quillacollo", "Sacaba"],
      "Oruro": ["Oruro", "Huanuni"],
    },
  },
  "Costa Rica": {
    name: "Costa Rica",
    departmentLabel: "Provincia",
    departments: {
      "San José": ["San José", "Escazú", "Desamparados"],
      "Alajuela": ["Alajuela", "San Carlos", "Grecia"],
      "Cartago": ["Cartago", "Turrialba", "Paraíso"],
      "Guanacaste": ["Liberia", "Nicoya", "Santa Cruz"],
      "Puntarenas": ["Puntarenas", "Quepos", "Golfito"],
      "Limón": ["Limón", "Siquirres", "Guápiles"],
      "Heredia": ["Heredia", "Sarapiquí", "San Joaquín"],
    },
  },
  España: {
    name: "España",
    departmentLabel: "Comunidad Autónoma",
    departments: {
      "Madrid": ["Madrid", "Alcalá de Henares", "Móstoles"],
      "Cataluña": ["Barcelona", "Girona", "Tarragona", "Lleida"],
      "Andalucía": ["Sevilla", "Málaga", "Granada", "Córdoba"],
      "Valencia": ["Valencia", "Alicante", "Castellón"],
      "Galicia": ["Santiago de Compostela", "Vigo", "A Coruña"],
    },
  },
};

export const COUNTRIES = Object.keys(GEO);
