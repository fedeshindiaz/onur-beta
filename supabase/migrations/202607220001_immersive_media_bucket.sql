insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'immersive-media',
  'immersive-media',
  true,
  null,
  array['image/jpeg', 'video/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- No se crea una política de escritura para clientes. Los derivados abiertos se
-- publican únicamente con la clave de servicio mediante el script administrativo.
