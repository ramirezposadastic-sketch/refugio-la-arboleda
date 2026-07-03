import { supabase } from "../supabase";

export const CATEGORIAS_FOTOS_SITIO = [
  "hero",
  "cabanas",
  "galeria",
  "actividades",
  "rio",
  "zonas",
  "exterior",
  "interior",
];

export async function cargarFotosActivasSitio() {
  const { data, error } = await supabase
    .from("fotos_sitio")
    .select("*")
    .eq("activa", true)
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: false });

  if (error) throw error;
  return data || [];
}

export function agruparFotosPorCategoria(fotos = []) {
  return fotos.reduce((grupos, foto) => {
    const categoria = foto.categoria || "galeria";
    return {
      ...grupos,
      [categoria]: [...(grupos[categoria] || []), foto],
    };
  }, {});
}

export function fotoDinamicaAImagen(foto) {
  return {
    src: foto.url,
    titulo: foto.titulo,
    texto: foto.descripcion || "",
    nota: "",
    alt: foto.descripcion || foto.titulo || "Imagen de Refugio La Arboleda",
    es_principal: Boolean(foto.es_principal),
  };
}

export function seleccionarFotosDinamicas(grupos, categorias) {
  if (!grupos) return [];
  return categorias.flatMap((categoria) => grupos[categoria] || []).map(fotoDinamicaAImagen);
}
