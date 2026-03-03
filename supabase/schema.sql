-- TESTING USERS TABLE (Temporary for Development)
CREATE TABLE public.testing_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- schema.sql
-- Create the bookmarks table (Private Storage)
CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.testing_users NOT NULL,
    url text NOT NULL,
    title text,
    ai_summary text,
    tags text[] DEFAULT '{}'::text[],
    status text DEFAULT 'pending'::text,
    reminder_date timestamptz,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (DISABLED for testing)
-- ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

/* Policies commented out for testing
-- Policy: Users can only select their own bookmarks
CREATE POLICY "Users can view their own bookmarks"
ON public.bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

... (other policies disabled)
*/

-- Create the community_posts table (Public Repository)
CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id uuid REFERENCES public.testing_users NOT NULL,
    url text NOT NULL,
    title text,
    description text,
    tags text[] DEFAULT '{}'::text[],
    likes int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (DISABLED for testing)
-- ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

/* Policies commented out for testing
-- Policy: Anyone can view community posts
CREATE POLICY "Anyone can view community posts"
ON public.community_posts FOR SELECT
TO public
USING (true);

... (other policies disabled)
*/
