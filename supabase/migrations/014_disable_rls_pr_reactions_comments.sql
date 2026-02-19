-- Allow client (anon key) to read/write pr_reactions and pr_comments.
-- App uses custom auth (simple_users); access control is enforced in application layer (lib/friends).
ALTER TABLE pr_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pr_comments DISABLE ROW LEVEL SECURITY;
