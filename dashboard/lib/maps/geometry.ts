import {z} from 'zod';
export const pointSchema=z.tuple([z.number().finite().min(-180).max(180),z.number().finite().min(-85).max(85)]);
export type Point=z.infer<typeof pointSchema>;
export const polygonSchema=z.object({type:z.literal('Polygon'),coordinates:z.tuple([z.array(pointSchema).min(4).max(501)])}).refine(p=>JSON.stringify(p.coordinates[0][0])===JSON.stringify(p.coordinates[0].at(-1)));
export type Polygon=z.infer<typeof polygonSchema>;
export function closePolygon(points:Point[]):Polygon{return {type:'Polygon',coordinates:[[...points,...(points.length?[points[0]]:[])]]};}
/** Preview only. The RPC computes the authoritative spherical area and perimeter. */
export function previewHectares(points:Point[]):number{
 const ring=closePolygon(points).coordinates[0];const rad=(n:number)=>n*Math.PI/180;
 let sum=0;for(let i=0;i<ring.length-1;i++)sum+=rad(ring[i+1][0]-ring[i][0])*(2+Math.sin(rad(ring[i][1]))+Math.sin(rad(ring[i+1][1])));
 return Math.abs(sum*6371008.8**2/2)/10000;
}
export function readGeometry(raw:string|null):{geometry:Polygon|null;invalid:boolean}{
 if(!raw)return {geometry:null,invalid:false};
 try{let value:unknown=JSON.parse(raw);if(value&&typeof value==='object'&&'type'in value){if(value.type==='Feature'&&'geometry'in value)value=value.geometry;else if(value.type==='FeatureCollection'&&'features'in value&&Array.isArray(value.features)&&value.features.length===1)value=value.features[0]?.geometry;}
 const result=polygonSchema.safeParse(value);return result.success?{geometry:result.data,invalid:false}:{geometry:null,invalid:true};}
 catch{return {geometry:null,invalid:true};}
}
