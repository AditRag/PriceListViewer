# Supabase schema

`profiles`: one row per application user. A trigger creates each new profile as a `viewer`; promote the intended account to `admin` with the documented SQL. `id` is the `auth.users` UUID, `email` is required, and `role` is either `viewer` or `admin`.

`catalogues`: stores company, category, year, title, description, original filename, Supabase Storage path, file size/pages, extracted `search_text`, whitespace-free `compact_search_text`, upload timestamp, and optional uploading profile.

Indexes support company, category, year, upload-date, and full-text lookups. RLS provides public catalogue reads while only authenticated admins may create, update, or delete catalogues and storage objects. The `catalogue-pdfs` bucket is public solely for viewing/downloading catalogue PDFs.
