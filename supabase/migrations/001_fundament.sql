-- 001_fundament.sql
-- Fundamentstabeller: brugere, engangskoder, sessioner, mail-log, audit-log, konfiguration.
--
-- INGEN mailadresser. INGEN navne. INGEN kundenumre. INGEN kundedata.
-- Alt personhenførbart er reduceret til et HMAC (CLAUDE.md §3 og §4).
--
-- Om RLS:
--   Browseren taler aldrig direkte med Supabase (CLAUDE.md §5.2). Al adgang går gennem
--   en Netlify Function med service role, som går uden om RLS. RLS er derfor
--   defence-in-depth, ikke den primære kontrol: den sikrer, at en lækket anon- eller
--   authenticated-nøgle ikke kan læse eller skrive NOGET.
--   Derfor aktiveres RLS på alle tabeller, og der oprettes bevidst INGEN permissive
--   policies. En tabel med RLS og nul policies afviser alt undtagen service role.
--   Det er et eksplicit valg, ikke en glemt policy.

-- ── brugere ────────────────────────────────────────────────────────────────────
-- Register over hvem der har været inde — ikke en port man skal stå på for at komme
-- ind (CLAUDE.md §7). Rækken oprettes automatisk ved første succesfulde login.
create table if not exists brugere (
  id             uuid primary key default gen_random_uuid(),
  email_hash     text        not null unique,
  rolle          text        not null default 'bruger',
  aktiv          boolean     not null default true,
  oprettet       timestamptz not null default now(),
  foerste_login  timestamptz,
  sidste_login   timestamptz,
  antal_logins   integer     not null default 0,

  constraint brugere_rolle_gyldig check (rolle in ('bruger', 'admin')),
  -- 64 hex-tegn. Fanger at nogen ved et uheld skriver en mailadresse i feltet.
  constraint brugere_email_hash_format check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint brugere_antal_logins_positivt check (antal_logins >= 0)
);

comment on table  brugere is
  'Interne brugere. Kategori B. Indeholder aldrig mail eller navn — navne hentes fra SharePoint-listen Platformsbrugere og joines på email_hash.';
comment on column brugere.email_hash is
  'hashEmail(mailadresse). Se netlify/functions/lib/pseudonym.js.';
comment on column brugere.aktiv is
  'false blokerer login. Eneste måde at lukke en enkelt person ude; bruges undtagelsesvist.';

create index if not exists brugere_rolle_idx        on brugere (rolle);
create index if not exists brugere_sidste_login_idx on brugere (sidste_login desc nulls last);

-- ── otp_koder ──────────────────────────────────────────────────────────────────
-- Kun hash af koden gemmes, aldrig koden i klartekst (CLAUDE.md §7).
create table if not exists otp_koder (
  id           uuid        primary key default gen_random_uuid(),
  email_hash   text        not null,
  kode_hash    text        not null,
  udloeber     timestamptz not null,
  forsoeg      integer     not null default 0,
  brugt        timestamptz,
  oprettet     timestamptz not null default now(),
  ip_hash      text,

  constraint otp_email_hash_format check (email_hash ~ '^[0-9a-f]{64}$'),
  constraint otp_kode_hash_format  check (kode_hash  ~ '^[0-9a-f]{64}$'),
  constraint otp_forsoeg_positivt  check (forsoeg >= 0)
);

comment on table  otp_koder is 'Engangskoder. TTL 10 min, engangsbrug, maks 5 forsøg.';
comment on column otp_koder.ip_hash is
  'Hash af klientens IP, kun til rate limiting. Rå IP gemmes ikke.';

create index if not exists otp_email_hash_idx on otp_koder (email_hash, oprettet desc);
create index if not exists otp_udloeber_idx   on otp_koder (udloeber);

-- ── sessioner ──────────────────────────────────────────────────────────────────
-- Cookien bærer et signeret token; her ligger kun hashet af det, så en læsning af
-- tabellen ikke giver nogen adgang.
create table if not exists sessioner (
  id           uuid        primary key default gen_random_uuid(),
  bruger_id    uuid        not null references brugere(id) on delete cascade,
  token_hash   text        not null unique,
  udloeber     timestamptz not null,
  oprettet     timestamptz not null default now(),
  sidst_set    timestamptz not null default now(),
  tilbagekaldt timestamptz,

  constraint sessioner_token_hash_format check (token_hash ~ '^[0-9a-f]{64}$')
);

comment on table sessioner is
  'Aktive sessioner. 8 timer for brugere, 1 time på /admin (CLAUDE.md §7).';

create index if not exists sessioner_bruger_idx   on sessioner (bruger_id);
create index if not exists sessioner_udloeber_idx on sessioner (udloeber);

-- ── mail_log ───────────────────────────────────────────────────────────────────
-- Skrives af lib/sendMail.js FØR afsendelsen, opdateres efter.
create table if not exists mail_log (
  id              uuid        primary key default gen_random_uuid(),
  modtager_hash   text[]      not null,
  antal_modtagere integer     not null default 0,
  emne            text,
  anledning       text,
  status          text        not null default 'sender',
  fejl            text,
  oprettet        timestamptz not null default now(),
  afsluttet       timestamptz,

  constraint mail_log_status_gyldig check (status in ('sender', 'sendt', 'fejlet'))
);

comment on column mail_log.modtager_hash is
  'hashEmail() pr. modtager. Mailadresser gemmes aldrig — kategori C.';

create index if not exists mail_log_oprettet_idx on mail_log (oprettet desc);
create index if not exists mail_log_status_idx   on mail_log (status) where status <> 'sendt';

-- ── audit_log ──────────────────────────────────────────────────────────────────
-- Skal kunne besvare "hvem har set denne aftale" (CLAUDE.md §8.1).
create table if not exists audit_log (
  id          bigserial   primary key,
  aktoer_hash text,
  handling    text        not null,
  objekt_type text,
  objekt_id   text,
  detaljer    jsonb       not null default '{}'::jsonb,
  tidspunkt   timestamptz not null default now()
);

comment on column audit_log.aktoer_hash is
  'email_hash eller kunde_hash. Null ved systemhandlinger.';
comment on column audit_log.detaljer is
  'Kun ikke-identificerende metadata. Aldrig navne, mails eller fritekst om personer.';

create index if not exists audit_log_tidspunkt_idx on audit_log (tidspunkt desc);
create index if not exists audit_log_aktoer_idx    on audit_log (aktoer_hash, tidspunkt desc);
create index if not exists audit_log_objekt_idx    on audit_log (objekt_type, objekt_id);

-- ── konfiguration ──────────────────────────────────────────────────────────────
-- Ét sted for satser. Det gamle system havde otte sæt hardkodede tal spredt i koden,
-- og en ubrugt satser-blok i priser.json (docs/kortlaegning.md §4.1 og §4.2).
create table if not exists konfiguration (
  noegle      text        primary key,
  vaerdi      jsonb       not null,
  beskrivelse text,
  opdateret   timestamptz not null default now()
);

comment on table konfiguration is
  'Satser og systemkonfiguration. Kategori A. Læses af lib/supabase.js hentSatser().';

insert into konfiguration (noegle, vaerdi, beskrivelse) values
  ('risiko_pct', '6.5'::jsonb, 'Risikotillæg i procent af listepris'),
  ('miljoe_pct', '3.5'::jsonb, 'Miljøbidrag i procent af (nettopris + risikotillæg)')
on conflict (noegle) do nothing;

-- ── RLS ────────────────────────────────────────────────────────────────────────
-- Aktiveret på alt. Ingen policies med vilje — se kommentaren øverst i filen.
alter table brugere        enable row level security;
alter table otp_koder      enable row level security;
alter table sessioner      enable row level security;
alter table mail_log       enable row level security;
alter table audit_log      enable row level security;
alter table konfiguration  enable row level security;

alter table brugere        force row level security;
alter table otp_koder      force row level security;
alter table sessioner      force row level security;
alter table mail_log       force row level security;
alter table audit_log      force row level security;
alter table konfiguration  force row level security;

-- Ingen af de klientvendte roller må røre noget. Al adgang sker med service role.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
