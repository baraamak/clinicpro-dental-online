alter table public.appointments
  add column if not exists treatment_plan_id uuid references public.treatment_plans(id) on delete set null;

create index if not exists idx_appointments_treatment_plan
  on public.appointments(treatment_plan_id, starts_at);

alter table public.treatment_plans
  add column if not exists clinical_summary text;