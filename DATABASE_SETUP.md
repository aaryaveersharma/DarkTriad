# Dark Triad AI — Database & Environment Setup Guide

Dark Triad AI runs **100% local-first** out of the box using IndexedDB in the user's browser, with a centralized Data Access Layer (`lib/storage/dataService.ts`) ready for PostgreSQL / Supabase cloud sync when configured.

## 1. Environment Variables
Add these in your hosting environment (e.g. Render, Vercel, or AI Studio Secrets):

```env
# Required for facial scanning, landmark mapping, improvement plans & Dactride AI chat
GEMINI_API_KEY=your_gemini_api_key

# Optional — enable Supabase PostgreSQL persistence & cloud image sync
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> Never put `SUPABASE_SERVICE_ROLE_KEY` or `GEMINI_API_KEY` into `NEXT_PUBLIC_*` variables.

## 2. Database Setup (Supabase / PostgreSQL)
1. Create a free project at **supabase.com**.
2. Open **SQL Editor → New Query**.
3. Paste the entire contents of `supabase/schema.sql` and click **Run**.
4. Verify in **Table Editor** that all 14 tables (`profiles`, `selfies`, `facial_analyses`, `facial_feature_ratings`, `facial_measurements`, `improvement_plans`, `skincare_recommendations`, `diet_recommendations`, `exercise_recommendations`, `daily_progress`, `progress_history`, `chatbot_conversations`, `chatbot_messages`, `user_preferences`) are created with RLS enabled.

## 3. Authentication & Storage Configuration
- In **Authentication → Providers**, keep **Email** enabled.
- In **Storage → Buckets**, verify `user-selfies` was created with **Public bucket = OFF** (private owner-only RLS policies are included in `supabase/schema.sql`).

## 4. Testing Connectivity
1. Open the app, click **PROFILE → Cloud Sync Status** to confirm whether Local-First or Supabase Remote mode is active.
2. Run a scan or register an email account and inspect `profiles` / `facial_analyses` in Supabase Table Editor.
