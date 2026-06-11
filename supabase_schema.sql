-- Create a table for public profiles
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text,
  highest_level integer default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create a table for game saves (1-to-1 with user)
create table public.saves (
  user_id uuid references public.profiles(id) not null primary key,
  meta_state jsonb default '{}'::jsonb,
  run_state jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- Game Saves Policies
create policy "Users can view their own save." on public.saves for select using (auth.uid() = user_id);
create policy "Users can insert their own save." on public.saves for insert with check (auth.uid() = user_id);
create policy "Users can update their own save." on public.saves for update using (auth.uid() = user_id);

-- Trigger to create a profile automatically upon user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'full_name', 'Player_' || floor(random() * 9000 + 1000)::text));
  
  -- Initialize empty save record for the user
  insert into public.saves (user_id) values (new.id);
  
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if it exists (for reruns)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
