import {Section} from '@/components/ui/section';
import {Table,THead,TBody,TH,TR,TD} from '@/components/ui/table';
import {fmtNum,fmtPct} from '@/lib/calc/format';
import type {PageData} from '@/lib/db/page-reproduccion';
export function CohortTable({data}:{data:PageData}){
 return <Section title="Resultados por servicio" description="Hechos vinculados a ciclos individuales. Stock y compras no cuentan como destetes. Los vientres declarados y los ciclos registrados muestran la cobertura disponible." flush>
  <Table><THead><TR><TH>Servicio / lote</TH><TH>Registrados / declarados</TH><TH>Tactadas / preñadas</TH><TH>Partos</TH><TH>Destetes</TH><TH>Kg al destete</TH><TH>Destete / declarados</TH></TR></THead>
  <TBody>{data.cohorts.map(({service,summary:c})=><TR key={service.id}>
   <TD>{service.temporada} · {data.loteNombre(service.lote_id)}</TD><TD>{c.registrados} / {c.declarados??'—'}</TD>
   <TD>{c.tactadas} / {c.prenadas}</TD><TD>{c.partos}</TD><TD>{c.destetados}</TD>
   <TD>{c.pesosFaltantes?'Peso incompleto':fmtNum(c.kgDestetados)}</TD><TD>{fmtPct(c.pctDestete)}</TD>
  </TR>)}</TBody></Table>
 </Section>;
}
