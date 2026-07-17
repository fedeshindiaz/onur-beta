-- Bucket privado para documentos clínicos.
-- Ruta obligatoria: {professional_user_id}/{patient_id}/{uuid}-{filename-seguro}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'clinical-documents',
  'clinical-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy clinical_documents_professional_select
on storage.objects for select to authenticated
using (
  bucket_id = 'clinical-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_professional()
);

create policy clinical_documents_professional_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'clinical-documents'
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.is_professional()
);

create policy clinical_documents_patient_permitted_select
on storage.objects for select to authenticated
using (
  bucket_id = 'clinical-documents'
  and exists (
    select 1
    from public.source_documents document
    join public.document_permissions permission
      on permission.document_id = document.id
     and permission.patient_id = document.patient_id
    where document.storage_path = storage.objects.name
      and permission.revoked_at is null
      and public.is_patient_self(document.patient_id)
  )
);
