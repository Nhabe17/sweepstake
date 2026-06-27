alter table matches
  add column if not exists bracket_slot integer;

create unique index if not exists matches_knockout_bracket_slot_key
  on matches(stage, bracket_slot)
  where stage <> 'group' and bracket_slot is not null;
