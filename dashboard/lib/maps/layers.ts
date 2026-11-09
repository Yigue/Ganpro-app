import type {StyleSpecification} from 'maplibre-gl';
import type {BaseLayer} from './types';
export function baseStyle(layer:BaseLayer):StyleSpecification{
 const source=layer==='satelite'?{tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],attribution:'Tiles © Esri — Sources: Esri, Maxar, Earthstar Geographics'}:layer==='relieve'?{tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],attribution:'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'}:{tiles:['https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png'],attribution:'© OpenStreetMap contributors © CARTO'};
 return {version:8,sources:{base:{type:'raster',...source,tileSize:256,maxzoom:layer==='relieve'?17:19}},layers:[{id:'base',type:'raster',source:'base'}]};
}
