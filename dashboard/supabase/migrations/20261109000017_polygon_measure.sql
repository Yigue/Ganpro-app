BEGIN;
CREATE FUNCTION public.ganpro_segments_intersect(ax float8,ay float8,bx float8,by_ float8,cx float8,cy float8,dx float8,dy float8)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
 SELECT greatest(least(ax,bx),least(cx,dx))<=least(greatest(ax,bx),greatest(cx,dx))+1e-12
 AND greatest(least(ay,by_),least(cy,dy))<=least(greatest(ay,by_),greatest(cy,dy))+1e-12
 AND ((bx-ax)*(cy-ay)-(by_-ay)*(cx-ax))*((bx-ax)*(dy-ay)-(by_-ay)*(dx-ax))<=1e-24
 AND ((dx-cx)*(ay-cy)-(dy-cy)*(ax-cx))*((dx-cx)*(by_-cy)-(dy-cy)*(bx-cx))<=1e-24
$$;
CREATE FUNCTION public.ganpro_measure_polygon(g jsonb) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE ring jsonb; n int; i int; j int; a jsonb; b jsonb; c jsonb; d jsonb;
 x float8; y float8; x2 float8; y2 float8; area float8:=0; perimeter float8:=0; h float8; minx float8:=180; maxx float8:=-180;
BEGIN
 IF g->>'type'<>'Polygon' OR jsonb_typeof(g->'coordinates')<>'array' OR jsonb_array_length(g->'coordinates')<>1 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 ring=g->'coordinates'->0; n=jsonb_array_length(ring);
 IF n<4 OR n>501 OR ring->0<>ring->(n-1) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 FOR i IN 0..n-2 LOOP
  a=ring->i; b=ring->(i+1);
  IF jsonb_typeof(a)<>'array' OR jsonb_array_length(a)<>2 OR jsonb_typeof(a->0)<>'number' OR jsonb_typeof(a->1)<>'number' THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  x=(a->>0)::float8; y=(a->>1)::float8; x2=(b->>0)::float8; y2=(b->>1)::float8;
  IF x NOT BETWEEN -180 AND 180 OR y NOT BETWEEN -85 AND 85 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  minx=least(minx,x); maxx=greatest(maxx,x);
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(ring) WITH ORDINALITY q(point,idx) WHERE idx>i+1 AND idx<n AND point=a) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
  area=area+radians(x2-x)*(2+sin(radians(y))+sin(radians(y2)));
  h=power(sin(radians(y2-y)/2),2)+cos(radians(y))*cos(radians(y2))*power(sin(radians(x2-x)/2),2);
  perimeter=perimeter+2*6371008.8*asin(least(1,sqrt(h)));
  IF i<n-3 THEN
   FOR j IN i+2..n-2 LOOP
    IF i=0 AND j=n-2 THEN CONTINUE; END IF;
    c=ring->j; d=ring->(j+1);
    IF public.ganpro_segments_intersect(x,y,x2,y2,(c->>0)::float8,(c->>1)::float8,(d->>0)::float8,(d->>1)::float8) THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
   END LOOP;
  END IF;
 END LOOP;
 area=abs(area*6371008.8*6371008.8/2)/10000;
 IF maxx-minx>180 OR area<0.01 OR area>1000000 THEN RAISE EXCEPTION 'GANPRO_INVALID_GEOMETRY'; END IF;
 RETURN jsonb_build_object('hectareas',round(area::numeric,2),'perimetro_m',round(perimeter::numeric,2));
END $$;
REVOKE ALL ON FUNCTION public.ganpro_segments_intersect(float8,float8,float8,float8,float8,float8,float8,float8),public.ganpro_measure_polygon(jsonb) FROM PUBLIC;
COMMIT;
