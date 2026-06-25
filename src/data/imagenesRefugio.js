const base = "/imagenes/refugio";

export const imagenesRefugio = {
  logo: `${base}/logo-refugio.png`,
  hero: `${base}/hero-cabana-exterior.jpg`,
  og: `${base}/og-refugio-la-arboleda.jpg`,
  cabanas: [
    {
      src: `${base}/cabana-habitacion.jpg`,
      titulo: "Habitación principal",
      alt: "Habitación principal de madera en Refugio La Arboleda",
    },
    {
      src: `${base}/cabana-interior.jpg`,
      titulo: "Cocina básica equipada",
      alt: "Cocina básica equipada dentro de una cabaña de madera",
    },
    {
      src: `${base}/cabana-mezzanine.jpg`,
      titulo: "Mezzanine auxiliar",
      alt: "Mezzanine con colchón auxiliar doble en una cabaña de madera",
    },
    {
      src: `${base}/cabana-terraza-jacuzzi.jpg`,
      titulo: "Terraza y jacuzzi",
      alt: "Terraza privada con jacuzzi rodeada de naturaleza",
    },
    {
      src: `${base}/cabana-bano.jpg`,
      titulo: "Baño estilo premium",
      alt: "Detalle exterior de una cabaña de madera de Refugio La Arboleda",
    },
    {
      src: `${base}/cabana-noche.jpg`,
      titulo: "Ambiente de noche",
      alt: "Cabaña iluminada de noche en Refugio La Arboleda",
    },
  ],
  actividades: [
    {
      src: `${base}/actividad-tubing.jpg`,
      titulo: "Tubing por el río",
      texto: "Actividad en el río para vivir una experiencia divertida y refrescante.",
      nota: "Sujeta a condiciones climáticas.",
      alt: "Huéspedes practicando tubing en el río",
    },
    {
      src: `${base}/actividad-naturaleza.jpg`,
      titulo: "Caminata ecológica",
      texto: "Experiencia inmersiva en la naturaleza para disfrutar y conocer especies del entorno.",
      alt: "Cascada natural rodeada de vegetación",
    },
    {
      src: `${base}/actividad-fogata.jpg`,
      titulo: "Fogata con chocolate caliente",
      texto: "Un momento cálido y especial frente a la fogata, acompañado de chocolate caliente de la región.",
      nota: "Sujeta a condiciones climáticas.",
      alt: "Fogata nocturna en zona natural",
    },
    {
      src: `${base}/actividad-exfoliacion.jpg`,
      titulo: "Exfoliación con chocolate",
      texto: "Exfoliación natural con chocolate de la región para relajar y suavizar la piel.",
      alt: "Exfoliación natural con chocolate en entorno natural",
    },
    {
      src: `${base}/actividad-zonas.jpg`,
      titulo: "Aromaterapia",
      texto: "Experiencia de relajación con aromas naturales en un entorno tranquilo.",
      alt: "Zona natural y común para descanso en Refugio La Arboleda",
    },
    {
      src: `${base}/actividad-rio.jpg`,
      titulo: "Río y zonas naturales",
      texto: "Espacios naturales para descansar, caminar y conectar con el entorno.",
      alt: "Río natural rodeado de vegetación",
    },
  ],
};

export const galeriaRefugio = [
  {
    src: imagenesRefugio.hero,
    alt: "Cabaña de madera de día en Refugio La Arboleda",
  },
  ...imagenesRefugio.cabanas.map(({ src, alt }) => ({ src, alt })),
  ...imagenesRefugio.actividades.map(({ src, alt }) => ({ src, alt })),
].slice(0, 12);
