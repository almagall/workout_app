# Supabase Storage Migration Guide

## Overview
The app has been migrated from localStorage to Supabase for data storage. This enables cross-device data synchronization - your workout data will now sync across desktop, mobile, and any other device where you sign in.

## What Changed

1. **Database Schema**: Modified to support simple auth system (TEXT user_id instead of UUID)
2. **Storage Layer**: All storage functions now use Supabase instead of localStorage
3. **Async Operations**: All storage functions are now async and must be awaited

## Required Steps

### 1. Run the Database Migration

You need to run the migration SQL in your Supabase database:

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Open the file: `supabase/migrations/002_simple_auth_support.sql`
5. Copy and paste the entire SQL into the SQL Editor
6. Click **Run** to execute the migration

This migration will:
- Change `user_id` columns from UUID to TEXT
- Remove foreign key constraints to `auth.users`
- Disable Row Level Security (RLS) since we're using simple auth

### 2. Verify Environment Variables

Make sure your `.env.local` file has the correct Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=https://igsoxjeailmyrwhfjdda.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Test the Migration

After running the migration:

1. **Sign in** on your desktop
2. **Create a template** or log a workout
3. **Sign in** on your mobile device with the same credentials
4. **Verify** that your data appears on mobile

## Important Notes

- **Data Migration**: Existing localStorage data will NOT be automatically migrated. If you have important data in localStorage, you may need to manually re-enter it or create a migration script.
- **Authentication**: The simple auth system (username/password stored in localStorage) remains unchanged. Only data storage has moved to Supabase.
- **Performance**: Data operations are now async, which may cause slight delays. The UI should show loading states appropriately.

## Troubleshooting

### "Failed to save template" or similar errors
- Check that the migration SQL ran successfully
- Verify your Supabase credentials in `.env.local`
- Check the browser console for detailed error messages

### Data not syncing
- Ensure you're using the same username/password on both devices
- Check that the Supabase migration completed successfully
- Verify network connectivity

### Type errors
- Make sure all async storage functions are being awaited
- Check that imports are correct

## Files Modified

- `lib/storage.ts` - Complete rewrite to use Supabase
- `supabase/migrations/002_simple_auth_support.sql` - New migration file
- All components using storage functions - Updated to handle async operations

## Next Steps

1. Run the migration SQL in Supabase
2. Test on desktop
3. Test on mobile
4. Verify data syncs correctly
