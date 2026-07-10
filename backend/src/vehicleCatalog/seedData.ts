/**
 * Catálogo curado inicial (marcas populares no BR + modelos comuns).
 * Pode ser ampliado depois via seed ou SQL.
 */
export type CatalogVehicleType = "CAR" | "MOTORCYCLE";

export type CatalogEntry = {
  brand: string;
  models: Partial<Record<CatalogVehicleType, string[]>>;
};

export const VEHICLE_CATALOG_SEED: CatalogEntry[] = [
  {
    brand: "Fiat",
    models: {
      CAR: [
        "Argo",
        "Cronos",
        "Mobi",
        "Pulse",
        "Fastback",
        "Strada",
        "Toro",
        "Fiorino",
        "Ducato",
        "Uno",
        "Palio",
        "Siena",
        "Outro",
      ],
    },
  },
  {
    brand: "Volkswagen",
    models: {
      CAR: [
        "Gol",
        "Polo",
        "Virtus",
        "T-Cross",
        "Nivus",
        "Taos",
        "Tiguan",
        "Saveiro",
        "Amarok",
        "Voyage",
        "Fox",
        "Jetta",
        "Outro",
      ],
    },
  },
  {
    brand: "Chevrolet",
    models: {
      CAR: [
        "Onix",
        "Onix Plus",
        "Tracker",
        "Spin",
        "S10",
        "Montana",
        "Equinox",
        "Trailblazer",
        "Prisma",
        "Cruze",
        "Outro",
      ],
    },
  },
  {
    brand: "Toyota",
    models: {
      CAR: [
        "Corolla",
        "Corolla Cross",
        "Yaris",
        "Hilux",
        "SW4",
        "RAV4",
        "Etios",
        "Outro",
      ],
    },
  },
  {
    brand: "Hyundai",
    models: {
      CAR: ["HB20", "HB20S", "Creta", "Tucson", "ix35", "Outro"],
    },
  },
  {
    brand: "Jeep",
    models: {
      CAR: ["Renegade", "Compass", "Commander", "Outro"],
    },
  },
  {
    brand: "Renault",
    models: {
      CAR: ["Kwid", "Sandero", "Logan", "Duster", "Oroch", "Outro"],
    },
  },
  {
    brand: "Nissan",
    models: {
      CAR: ["Kicks", "Versa", "Frontier", "Sentra", "Outro"],
    },
  },
  {
    brand: "Honda",
    models: {
      CAR: ["City", "Civic", "HR-V", "WR-V", "Fit", "CR-V", "Outro"],
      MOTORCYCLE: [
        "CG 160",
        "Biz 125",
        "Pop 110",
        "PCX",
        "CB 300",
        "CB 500",
        "XRE 300",
        "Outro",
      ],
    },
  },
  {
    brand: "Ford",
    models: {
      CAR: ["Ka", "EcoSport", "Ranger", "Territory", "Outro"],
    },
  },
  {
    brand: "Peugeot",
    models: {
      CAR: ["208", "2008", "3008", "Partner", "Outro"],
    },
  },
  {
    brand: "Citroën",
    models: {
      CAR: ["C3", "C4 Cactus", "Basalt", "Outro"],
    },
  },
  {
    brand: "Mitsubishi",
    models: {
      CAR: ["L200", "Outlander", "Pajero", "ASX", "Outro"],
    },
  },
  {
    brand: "BYD",
    models: {
      CAR: ["Dolphin", "Song Plus", "Seal", "Yuan Plus", "Outro"],
    },
  },
  {
    brand: "Caoa Chery",
    models: {
      CAR: ["Tiggo 5X", "Tiggo 7", "Tiggo 8", "Arrizo 6", "Outro"],
    },
  },
  {
    brand: "Yamaha",
    models: {
      MOTORCYCLE: [
        "Factor 150",
        "Fazer 250",
        "MT-03",
        "MT-07",
        "XTZ 150",
        "NMAX",
        "Crosser 150",
        "Outro",
      ],
    },
  },
  {
    brand: "Suzuki",
    models: {
      MOTORCYCLE: ["Yes 125", "Intruder 125", "V-Strom", "Outro"],
    },
  },
  {
    brand: "Kawasaki",
    models: {
      MOTORCYCLE: ["Ninja 400", "Z400", "Versys", "Outro"],
    },
  },
  {
    brand: "BMW",
    models: {
      CAR: ["Série 1", "Série 3", "X1", "X3", "Outro"],
      MOTORCYCLE: ["G 310", "F 850", "R 1250", "Outro"],
    },
  },
  {
    brand: "Mercedes-Benz",
    models: {
      CAR: ["Classe A", "Classe C", "GLA", "GLC", "Outro"],
    },
  },
  {
    brand: "Outra",
    models: {
      CAR: ["Outro"],
      MOTORCYCLE: ["Outro"],
    },
  },
];
