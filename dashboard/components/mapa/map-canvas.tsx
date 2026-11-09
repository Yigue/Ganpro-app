'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as MapInstance,Marker,GeoJSONSource} from 'maplibre-gl';
import type {Feature,Polygon as GeoPolygon} from 'geojson';
import type {MapPaddock,BaseLayer} from '@/lib/maps/types';
import {baseStyle} from '@/lib/maps/layers';
import {closePolygon,type Point} from '@/lib/maps/geometry';
type Props={paddocks:MapPaddock[];points:Point[];drawing:boolean;layer:BaseLayer;select:(id:string)=>void;add:(point:Point)=>void;move:(index:number,point:Point)=>void};
export function MapCanvas(props:Props){
 const div=useRef<HTMLDivElement>(null),map=useRef<MapInstance|null>(null),latest=useRef(props),markers=useRef<Marker[]>([]);latest.current=props;
 const [error,setError]=useState('');
 const update=()=>{
  const instance=map.current;if(!instance?.isStyleLoaded())return;
  const features:Feature<GeoPolygon>[] =latest.current.paddocks.filter(p=>p.geometry).map(p=>({type:'Feature',geometry:p.geometry!,properties:{id:p.id,name:p.nombre,color:((p.capacidadEV!=null&&p.ev!=null&&p.ev>p.capacidadEV)||(p.capacidadCabezas!=null&&p.cabezas>p.capacidadCabezas))?'#dc2626':p.tipo==='MONTE'?'#92400e':p.tipo==='PASTURA'?'#16a34a':'#0f766e'}}));
  if(!instance.getSource('paddocks')){
   instance.addSource('paddocks',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   instance.addLayer({id:'paddock-fill',type:'fill',source:'paddocks',paint:{'fill-color':['get','color'],'fill-opacity':0.3}});
   instance.addLayer({id:'paddock-line',type:'line',source:'paddocks',paint:{'line-color':['get','color'],'line-width':3}});
   instance.addSource('draft',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
   instance.addLayer({id:'draft-fill',type:'fill',source:'draft',paint:{'fill-color':'#2563eb','fill-opacity':0.2}});
   instance.addLayer({id:'draft-line',type:'line',source:'draft',paint:{'line-color':'#2563eb','line-width':3,'line-dasharray':[2,1]}});
  }
  (instance.getSource('paddocks') as GeoJSONSource).setData({type:'FeatureCollection',features});
  (instance.getSource('draft') as GeoJSONSource).setData({type:'FeatureCollection',features:latest.current.points.length>=3?[{type:'Feature',geometry:closePolygon(latest.current.points),properties:{}}]:[]});
 };
 useEffect(()=>{
  let disposed=false;
  import('maplibre-gl').then(lib=>{
   if(disposed||!div.current)return;
   try{
    const instance=new lib.Map({container:div.current,style:baseStyle(latest.current.layer),center:[-58.4,-32.4],zoom:9});map.current=instance;
    instance.addControl(new lib.NavigationControl(),'bottom-left');instance.addControl(new lib.ScaleControl(),'bottom-left');instance.addControl(new lib.FullscreenControl(),'top-left');instance.addControl(new lib.GeolocateControl({trackUserLocation:false}),'top-left');
    instance.on('style.load',update);
    instance.on('load',()=>{const points=latest.current.paddocks.flatMap(p=>p.geometry?.coordinates[0]??[]);if(points.length){const bounds=new lib.LngLatBounds(points[0],points[0]);points.forEach(p=>bounds.extend(p));instance.fitBounds(bounds,{padding:55,maxZoom:16,duration:0});}});
    instance.on('click',event=>{if(latest.current.drawing){latest.current.add([event.lngLat.lng,event.lngLat.lat]);return;}if(!instance.getLayer('paddock-fill'))return;const feature=instance.queryRenderedFeatures(event.point,{layers:['paddock-fill']})[0];if(feature?.properties?.id)latest.current.select(String(feature.properties.id));});
    instance.on('error',()=>setError('No se pudo cargar parte del mapa. Probá otra vista; el dibujo se conserva.'));
   }catch{setError('No se pudo abrir el mapa. Se necesita un navegador con WebGL.');}
  }).catch(()=>setError('No se pudo cargar el mapa. Reintentá la página.'));
  return()=>{disposed=true;markers.current.forEach(m=>m.remove());map.current?.remove();map.current=null;};
 // A single WebGL canvas survives form edits and keeps the draft.
 },[]);
 useEffect(()=>{update();const instance=map.current;if(!instance)return;markers.current.forEach(m=>m.remove());markers.current=[];
  if(props.drawing)import('maplibre-gl').then(lib=>{if(map.current!==instance)return;props.points.forEach((point,index)=>{
   const marker=new lib.Marker({draggable:true,color:'#2563eb'}).setLngLat(point).addTo(instance);marker.getElement().addEventListener('click',e=>e.stopPropagation());marker.on('dragend',()=>{const p=marker.getLngLat();latest.current.move(index,[p.lng,p.lat]);});markers.current.push(marker);
  });});
 },[props.paddocks,props.points,props.drawing]);
 useEffect(()=>{if(map.current){setError('');map.current.setStyle(baseStyle(props.layer));}},[props.layer]);
 return <><div ref={div} data-testid="ganpro-map" className="h-[480px] w-full rounded-lg sm:h-[600px]"/>{error&&<p role="status" className="rounded bg-amber-50 p-2 text-xs text-amber-900">{error}</p>}</>;
}
