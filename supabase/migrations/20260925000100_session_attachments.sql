-- Session attachments: private medical files/images per appointment/session.
create table if not exists public.appointment_attachments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  file_name text not null,
  storage_path text not null unique,
  mime_type text,
  size_bytes bigint,
  category text not null default 'dental_image' check (category in ('dental_image','xray','cbct','document','other')),
  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_appointment_attachments_appointment
  on public.appointment_attachments(appointment_id, created_at desc);

alter table public.appointment_attachments enable row level security;

create policy appointment_attachments_select_member
  on public.appointment_attachments for select to authenticated
  using ((select private.is_clinic_member(clinic_id)));

create policy appointment_attachments_insert_clinical
  on public.appointment_attachments for insert to authenticated
  with check ((select private.has_clinic_role(clinic_id, array['owner','manager','doctor','receptionist']))
    and uploaded_by = (select auth.uid()));

create policy appointment_attachments_delete_manager
  on public.appointment_attachments for delete to authenticated
  using ((select private.has_clinic_role(clinic_id, array['owner','manager','doctor'])));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinic-sessions','clinic-sessions',false,262144000,
  array['image/jpeg','image/png','image/webp','image/tiff','application/pdf','application/dicom','application/zip','application/x-zip-compressed','application/octet-stream'])
on conflict (id) do update set public=false,file_size_limit=262144000,allowed_mime_types=excluded.allowed_mime_types;

create policy clinic_sessions_storage_select
  on storage.objects for select to authenticated
  using (bucket_id='clinic-sessions' and (select private.is_clinic_member((storage.foldername(name))[1]::uuid)));

create policy clinic_sessions_storage_insert
  on storage.objects for insert to authenticated
  with check (bucket_id='clinic-sessions' and (select private.has_clinic_role((storage.foldername(name))[1]::uuid, array['owner','manager','doctor','receptionist'])));

create policy clinic_sessions_storage_delete
  on storage.objects for delete to authenticated
  using (bucket_id='clinic-sessions' and (select private.has_clinic_role((storage.foldername(name))[1]::uuid, array['owner','manager','doctor'])));