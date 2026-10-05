const base = `${import.meta.env.BASE_URL}imagenes/refugio/recorrido-cabana/`;

const scene = (id, file, label, description, width, height, hotspots = [], center = 0.5) => ({
  id, label, description, width, height, hotspots, center,
  src: `${base}${file}.webp`, thumb: `${base}${file}-mini.webp`,
});

// Only landmarks visible in the photographs receive a navigation marker.
// Exterior N06 remains independent: the specific cabin/entrance is unconfirmed.
export const scenes = [
  scene('P02', 'acceso', 'Acceso', 'La entrada, la escalera y el interior de madera.', 1600, 590, [
    { target: 'P04', x: 0.47, y: 0.73, label: 'Ver habitación' },
    { target: 'P17', x: 0.30, y: 0.56, label: 'Ver cocina' },
  ], 0.38),
  scene('P04', 'habitacion', 'Habitación', 'La cama principal y el acceso al altillo.', 1600, 380, [
    { target: 'P12', x: 0.27, y: 0.46, label: 'Subir al altillo' },
    { target: 'P02', x: 0.82, y: 0.70, label: 'Volver al acceso' },
  ]),
  scene('P12', 'altillo', 'Altillo', 'Un segundo espacio de descanso sobre la habitación.', 1600, 416, [
    { target: 'P04', x: 0.67, y: 0.81, label: 'Ver habitación' },
  ]),
  scene('P17', 'cocina', 'Cocina', 'La cocina equipada y la salida hacia la terraza.', 1600, 358, [
    { target: 'P02', x: 0.34, y: 0.72, label: 'Volver al acceso' },
    { target: 'P28', x: 0.92, y: 0.64, label: 'Salir a la terraza' },
  ], 0.65),
  scene('P28', 'terraza', 'Terraza', 'Mesa al aire libre, jacuzzi y naturaleza alrededor.', 1600, 760, [
    { target: 'P27', x: 0.78, y: 0.69, label: 'Ver jacuzzi' },
  ], 0.61),
  scene('P27', 'jacuzzi', 'Jacuzzi', 'Otra mirada a la terraza y su entorno natural.', 1600, 464, [
    { target: 'P17', x: 0.265, y: 0.52, label: 'Entrar a la cocina' },
    { target: 'P28', x: 0.405, y: 0.69, label: 'Ver terraza' },
  ], 0.34),
  scene('EXT-N06', 'exterior', 'Exterior', 'La fachada de madera y los caminos del jardín.', 1600, 620, [], 0.36),
];

export const initialSceneId = 'P28';
export const coverSrc = `${base}portada-recorrido.webp`;

export const photos = [
  { id: 'N20', file: 'foto-fachada', title: 'Entre árboles y madera', alt: 'Fachada de la cabaña con ventanas altas, escaleras de piedra y jardín', width: 1600, height: 872 },
  { id: 'N16', file: 'foto-interior', title: 'Un espacio para descansar', alt: 'Interior de la cabaña con cama, escalera de madera y altillo', width: 960, height: 1280 },
  { id: 'N11', file: 'foto-terraza', title: 'La terraza', alt: 'Mesa, sillas y jacuzzi en la terraza cubierta, rodeada de árboles', width: 960, height: 1280 },
  { id: 'N08', file: 'foto-jacuzzi', title: 'Tu momento de calma', alt: 'Jacuzzi blanco en la terraza de madera de la cabaña', width: 1200, height: 1600 },
  { id: 'N14', file: 'foto-habitacion', title: 'La habitación principal', alt: 'Cama doble con ropa blanca junto a las ventanas de la cabaña', width: 960, height: 1280 },
  { id: 'N03', file: 'foto-entrada', title: 'Bienvenido a la cabaña', alt: 'Entrada de madera y escalones de piedra entre la vegetación del jardín', width: 900, height: 1600 },
].map((photo) => ({ ...photo, src: `${base}${photo.file}.webp`, preview: `${base}${photo.file}-480.webp` }));
