alter table matches
  add column if not exists odds jsonb;
