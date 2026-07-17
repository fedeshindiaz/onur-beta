-- Metadatos clínicos mínimos y auditoría de permisos de documentos.

alter table public.source_documents
  add column if not exists document_date date not null default current_date,
  add column if not exists description text,
  add column if not exists file_size_bytes bigint check (file_size_bytes is null or file_size_bytes >= 0);

create or replace function public.audit_document_permission_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.audit_events (actor_user_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    case
      when tg_op = 'INSERT' then 'document_permission_granted'
      when new.revoked_at is not null and old.revoked_at is null then 'document_permission_revoked'
      else 'document_permission_updated'
    end,
    'source_document',
    new.document_id,
    jsonb_build_object('patient_id', new.patient_id, 'level', new.level)
  );
  return new;
end;
$$;

create trigger document_permissions_audit
after insert or update on public.document_permissions
for each row execute function public.audit_document_permission_change();
