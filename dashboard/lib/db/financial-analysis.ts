import 'server-only';
import {getLedger} from '@/lib/db/ledger';
import {businessToday} from '@/lib/calc/business-date';
import { ejercicioAnterior, ejercicioDe, mesKey, mesLabel, ultimosMeses } from '@/lib/calc/fechas';
import { dolarEn, enRango, flujoProyectado, margenBruto, porMes, precioVigente, valuacionRodeo } from '@/lib/calc/finanzas';
import { fmtARS, fmtUSD } from '@/lib/calc/format';
import { canEdit, getSessionPerfil } from '@/lib/db/auth';
import { getAnimals, getCategoriasConfig, getEstablecimiento, getLotes, getMovimientosFinancieros, getPrecios } from '@/lib/db/client';
export async function financialAnalysis(searchParams:Promise<{moneda?:string}>){
  const [{ moneda }, movs, precios, animals, config, lotes, est, perfil, ledger] = await Promise.all([
    searchParams,
    getMovimientosFinancieros(),
    getPrecios(),
    getAnimals(),
    getCategoriasConfig(),
    getLotes(),
    getEstablecimiento(),
    getSessionPerfil(),
    getLedger(businessToday().slice(0,7)),
  ]);

  const usd = moneda === 'usd';
  const ahora = Date.now();
  const dolar = dolarEn(precios, ahora);
  const dolarMep = dolarEn(precios, ahora, 'dolar_mep');
  const fmt = (v: number | null | undefined) => (usd ? fmtUSD(v != null && dolar ? v / dolar : null) : fmtARS(v));

  const actual = ejercicioDe(ahora, est.inicio_ejercicio_mes);
  const anterior = ejercicioAnterior(actual, est.inicio_ejercicio_mes);
  const mbActual = margenBruto(enRango(movs, actual.inicio, actual.fin));
  const mbAnterior = margenBruto(enRango(movs, anterior.inicio, anterior.fin));

  const meses = ultimosMeses(12, ahora).map((m) => m.key);
  const mensual = porMes(movs, meses, precios);
  const chart = mensual.map((m) => ({
    label: mesLabel(m.mes),
    Ingresos: usd ? m.ingresosUSD : m.ingresos,
    Gastos: usd ? m.gastosUSD : m.gastos,
  }));

  const balances=new Map(ledger.documentos.map(d=>[d.id,d]));
  const pendientes=movs.filter(m=>m.tipo==='INGRESO'&&Number(balances.get(m.id)?.pendiente??0)>0).map(m=>({...m,monto:Number(balances.get(m.id)!.pendiente),fecha_cobro:balances.get(m.id)!.vencimiento}));
  const futuros = Array.from({ length: 6 }, (_, i) => mesKey(new Date(new Date(ahora).getFullYear(), new Date(ahora).getMonth() + i + 1, 1).getTime()));
  const flujo = flujoProyectado(mensual, pendientes, futuros);

  const precio = precioVigente(precios);
  const valuacion = valuacionRodeo(animals, config, precio);
  const valorRodeo = valuacion.some(v => v.valor == null) ? null : valuacion.reduce((a, v) => a + (v.valor ?? 0), 0);
  const editable = canEdit(perfil?.rol);

  const filasMB = [
    { label: 'Ingresos por ventas', a: mbActual.ingresos, b: mbAnterior.ingresos },
    { label: 'Diferencia de inventario', a: mbActual.difInventario, b: mbAnterior.difInventario },
    { label: 'Costos directos', a: -mbActual.costosDirectos, b: -mbAnterior.costosDirectos },
    { label: 'Margen parcial sin ajuste de inventario', a: mbActual.margenBruto, b: mbAnterior.margenBruto, bold: true },
    { label: 'Estructura', a: -mbActual.estructura, b: -mbAnterior.estructura },
    { label: 'Resultado parcial', a: mbActual.resultado, b: mbAnterior.resultado, bold: true },
  ];


return {dolarMep,precio,movs,usd,fmt,actual,anterior,mbActual,mbAnterior,chart,pendientes,flujo,valuacion,valorRodeo,dolar,editable,lotes,filasMB,ahora};
}
export type FinancialAnalysis=Awaited<ReturnType<typeof financialAnalysis>>;
