export interface FilaRFID {
  rfid: string | null;
  caravana: string | null;
  peso: number | null;
  sexo: 'M' | 'H' | null;
  categoria: string | null;
  raza: string | null;
  fecha: number | null;
}

const ALIAS: Record<string, keyof FilaRFID> = {
  rfid: 'rfid',
  eid: 'rfid',
  tag: 'rfid',
  electronico: 'rfid',
  caravana: 'caravana',
  id_caravana: 'caravana',
  visual: 'caravana',
  vid: 'caravana',
  peso: 'peso',
  kg: 'peso',
  weight: 'peso',
  sexo: 'sexo',
  categoria: 'categoria',
  raza: 'raza',
  fecha: 'fecha',
  date: 'fecha',
};

const norm = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z_]/g, '');

function parseFecha(v: string): number | null {
  const m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (m) {
    const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
    return new Date(y, Number(m[2]) - 1, Number(m[1]), 12).getTime();
  }
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/**
 * Lee el CSV del bastón RFID (Allflex, Tru-Test, Gallagher, etc.). Acepta coma,
 * punto y coma o tab, con o sin encabezado. Sin encabezado asume: RFID, peso.
 */
export function parseCsvRFID(texto: string): { filas: FilaRFID[]; errores: string[] } {
  const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lineas.length) return { filas: [], errores: ['El archivo está vacío'] };
  const sep = [';', '\t', ','].find((s) => lineas[0].includes(s)) ?? ',';
  const celdas = (l: string) => l.split(sep).map((c) => c.trim().replace(/^"|"$/g, ''));

  const primera = celdas(lineas[0]).map(norm);
  const tieneHeader = primera.some((c) => c in ALIAS);
  const columnas: (keyof FilaRFID | null)[] = tieneHeader ? primera.map((c) => ALIAS[c] ?? null) : ['rfid', 'peso'];
  const datos = tieneHeader ? lineas.slice(1) : lineas;

  const filas: FilaRFID[] = [];
  const errores: string[] = [];
  datos.forEach((linea, i) => {
    const vals = celdas(linea);
    const f: FilaRFID = { rfid: null, caravana: null, peso: null, sexo: null, categoria: null, raza: null, fecha: null };
    columnas.forEach((col, j) => {
      const v = vals[j];
      if (!col || v == null || v === '') return;
      if (col === 'peso') {
        const n = Number(v.replace(',', '.'));
        f.peso = Number.isFinite(n) && n > 0 ? n : null;
      } else if (col === 'sexo') {
        const s = v.toUpperCase();
        f.sexo = s.startsWith('M') ? 'M' : s.startsWith('H') || s.startsWith('F') ? 'H' : null;
      } else if (col === 'fecha') {
        f.fecha = parseFecha(v);
      } else if (col === 'rfid') {
        f.rfid = v.replace(/\s/g, '');
      } else {
        f[col] = v;
      }
    });
    if (!f.rfid && !f.caravana) {
      errores.push(`Línea ${i + (tieneHeader ? 2 : 1)}: falta RFID o caravana`);
      return;
    }
    filas.push(f);
  });
  return { filas, errores };
}
