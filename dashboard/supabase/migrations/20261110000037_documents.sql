BEGIN;
-- Supabase Storage is optional only in the isolated PostgreSQL test scaffold.
DO $$ BEGIN IF to_regclass('storage.buckets') IS NOT NULL THEN
 INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types) VALUES('comprobantes','comprobantes',false,4194304,ARRAY['application/pdf','image/png','image/jpeg']) ON CONFLICT(id) DO NOTHING;
 EXECUTE $p$CREATE POLICY ganpro_document_upload ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='comprobantes' AND public.ganpro_rol() IN('admin','campo') AND (storage.foldername(name))[1]=auth.uid()::text)$p$;
 EXECUTE $p$CREATE POLICY ganpro_document_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='comprobantes' AND public.ganpro_rol() IS NOT NULL AND EXISTS(SELECT 1 FROM public.documentos_comprobantes d WHERE d.path=name))$p$;
 END IF; END $$;
CREATE FUNCTION public.ganpro_document_attach(d jsonb) RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE present boolean; ident text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.movimientos_financieros WHERE id=d->>'movimiento_id') THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 IF d->>'path' NOT LIKE auth.uid()::text||'/%' OR d->>'sha256' !~ '^[a-f0-9]{64}$' OR nullif(trim(d->>'nombre'),'') IS NULL THEN RAISE EXCEPTION 'GANPRO_INVALID_INPUT'; END IF;
 IF to_regclass('storage.objects') IS NULL THEN RAISE EXCEPTION 'GANPRO_STORAGE_UNAVAILABLE'; END IF;
 EXECUTE 'SELECT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id=''comprobantes'' AND name=$1)' INTO present USING d->>'path';
 IF NOT present THEN RAISE EXCEPTION 'GANPRO_NOT_FOUND'; END IF;
 INSERT INTO public.documentos_comprobantes(movimiento_id,nombre,path,sha256,actor_id) VALUES(d->>'movimiento_id',d->>'nombre',d->>'path',d->>'sha256',auth.uid()) RETURNING id INTO ident;
 RETURN jsonb_build_object('id',ident,'message','Comprobante adjuntado en almacenamiento privado');
END $$;
REVOKE ALL ON FUNCTION public.ganpro_document_attach(jsonb) FROM PUBLIC;
COMMIT;
