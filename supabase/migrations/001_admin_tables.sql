-- ============================================================
-- RepEAT Admin Tables Migration
-- Run this in Supabase Dashboard → SQL Editor
-- These tables extend the existing repeateats schema
-- ============================================================

-- ─── Support Tickets ─────────────────────────────────────────
create table if not exists public.support_tickets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.users(id) on delete set null,
  user_email       text not null,
  user_name        text,
  portal           text not null check (portal in ('customer', 'restaurant', 'creator')),
  subject          text not null,
  category         text not null default 'general'
                   check (category in ('claim_issue','redemption_issue','technical','payment','collab','account','general')),
  status           text not null default 'open'
                   check (status in ('open','in_progress','resolved','closed')),
  priority         text not null default 'normal'
                   check (priority in ('normal','urgent')),
  first_response_at timestamptz,
  resolved_at      timestamptz,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute procedure public.update_updated_at();

-- ─── Support Messages (chat thread per ticket) ───────────────
create table if not exists public.support_messages (
  id               uuid primary key default gen_random_uuid(),
  ticket_id        uuid references public.support_tickets(id) on delete cascade,
  sender_type      text not null check (sender_type in ('user', 'admin')),
  sender_id        uuid references public.users(id) on delete set null,
  message          text not null,
  is_internal_note boolean default false,
  read_by_admin    boolean default true,   -- admin sees it immediately
  read_by_user     boolean default false,  -- user needs to open ticket
  created_at       timestamptz default now()
);

-- ─── Support Email Log ───────────────────────────────────────
create table if not exists public.support_email_log (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid references public.support_tickets(id) on delete cascade,
  to_email    text not null,
  subject     text not null,
  body        text not null,
  sent_at     timestamptz default now()
);

-- ─── Quick Reply Templates ───────────────────────────────────
create table if not exists public.quick_reply_templates (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  body       text not null,
  category   text not null default 'all'
             check (category in ('claim_issue','redemption_issue','technical','payment','collab','account','general','all')),
  created_at timestamptz default now()
);

-- Seed some default templates
insert into public.quick_reply_templates (title, body, category) values
  ('Looking into it', 'Hi {{name}}, thanks for reaching out! I am looking into this right now and will get back to you within 24 hours.', 'general'),
  ('Need more info', 'Hi {{name}}, could you share a screenshot or more details about the issue? That will help me resolve this faster.', 'general'),
  ('Claim issue resolved', 'Hi {{name}}, I have resolved the claim issue on your account. Please try claiming the deal again and let me know if it works!', 'claim_issue'),
  ('QR code fix', 'Hi {{name}}, I have reset your QR code. Please open the app, go to your claims, and show the new QR code at the restaurant.', 'redemption_issue'),
  ('Account issue fixed', 'Hi {{name}}, I have fixed the issue with your account. Please sign out and sign back in, and everything should work correctly now.', 'account'),
  ('Collab update', 'Hi {{name}}, I have reviewed the collab situation and here is what I found: [add details]. Please let me know if you have questions.', 'collab'),
  ('This is now resolved', 'Hi {{name}}, I am happy to let you know this issue has been fully resolved. Feel free to reach out if anything else comes up!', 'general')
on conflict do nothing;

-- ─── Ticket SLA Configuration ───────────────────────────────
create table if not exists public.ticket_sla_config (
  id           uuid primary key default gen_random_uuid(),
  priority     text not null unique check (priority in ('normal', 'urgent')),
  target_hours integer not null default 24
);

insert into public.ticket_sla_config (priority, target_hours) values
  ('normal', 24),
  ('urgent', 4)
on conflict (priority) do nothing;

-- ─── Admin Settings ──────────────────────────────────────────
create table if not exists public.admin_settings (
  key   text primary key,
  value text not null
);

insert into public.admin_settings (key, value) values
  ('auto_reply_enabled', 'false'),
  ('auto_reply_message', 'Thanks for reaching out! I am currently unavailable but will respond within 24 hours.'),
  ('last_ticket_check', now()::text)
on conflict (key) do nothing;

-- ─── Email Prospects (Ontario restaurant outreach) ───────────
create table if not exists public.email_prospects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           text,
  phone           text,
  website         text,
  address         text,
  city            text,
  source          text default 'google_places' check (source in ('google_places', 'manual')),
  status          text default 'prospect' check (status in ('prospect', 'emailed', 'registered')),
  google_place_id text unique,
  created_at      timestamptz default now()
);

-- ─── Email Campaigns ─────────────────────────────────────────
create table if not exists public.email_campaigns (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  subject     text not null,
  body        text not null,
  status      text default 'draft' check (status in ('draft', 'sent')),
  sent_at     timestamptz,
  total_sent  integer default 0,
  created_at  timestamptz default now()
);

-- ─── Campaign Sends (per-recipient tracking) ─────────────────
create table if not exists public.campaign_sends (
  id          uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.email_campaigns(id) on delete cascade,
  prospect_id uuid references public.email_prospects(id) on delete cascade,
  to_email    text not null,
  status      text default 'pending' check (status in ('pending', 'sent', 'failed')),
  sent_at     timestamptz,
  opened_at   timestamptz,
  created_at  timestamptz default now()
);

-- ─── Indexes ─────────────────────────────────────────────────
create index if not exists idx_support_tickets_status    on public.support_tickets(status);
create index if not exists idx_support_tickets_priority  on public.support_tickets(priority);
create index if not exists idx_support_tickets_portal    on public.support_tickets(portal);
create index if not exists idx_support_tickets_created   on public.support_tickets(created_at);
create index if not exists idx_support_messages_ticket   on public.support_messages(ticket_id);
create index if not exists idx_email_prospects_status    on public.email_prospects(status);
create index if not exists idx_campaign_sends_campaign   on public.campaign_sends(campaign_id);

-- ─── RLS: Admin bypasses via service role (no policies needed) ─
-- The admin app uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- For safety, enable RLS but add no policies — only service role can access.

alter table public.support_tickets       enable row level security;
alter table public.support_messages      enable row level security;
alter table public.support_email_log     enable row level security;
alter table public.quick_reply_templates enable row level security;
alter table public.ticket_sla_config     enable row level security;
alter table public.admin_settings        enable row level security;
alter table public.email_prospects       enable row level security;
alter table public.email_campaigns       enable row level security;
alter table public.campaign_sends        enable row level security;

-- Allow authenticated users to INSERT their own support ticket
-- (when a customer/restaurant/creator submits a support request from the main app)
create policy "support_tickets: user insert own"
  on public.support_tickets for insert
  with check (auth.uid() = user_id);

-- Allow users to read their own tickets
create policy "support_tickets: user read own"
  on public.support_tickets for select
  using (auth.uid() = user_id);

-- Allow users to read messages on their own tickets (non-internal)
create policy "support_messages: user read own ticket"
  on public.support_messages for select
  using (
    is_internal_note = false
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id and t.user_id = auth.uid()
    )
  );

-- Allow users to insert messages on their own tickets
create policy "support_messages: user insert own ticket"
  on public.support_messages for insert
  with check (
    sender_type = 'user'
    and auth.uid() = sender_id
    and exists (
      select 1 from public.support_tickets t
      where t.id = ticket_id and t.user_id = auth.uid()
    )
  );
