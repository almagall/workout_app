# Supabase Setup for Simplified Authentication

## Step 1: Enable Email Signups

**IMPORTANT**: You must enable email signups in Supabase:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **Authentication** → **Providers**
4. Find **Email** in the list of providers
5. **Enable** the Email provider (toggle it ON)
6. Make sure "Enable email signups" is checked
7. Save the changes

## Step 2: Disable Email Confirmation (Optional but Recommended)

To use the simplified "Get Started" flow without email verification:

1. Go to **Authentication** → **Settings**
2. Under **Email Auth**, find **"Enable email confirmations"**
3. **Turn OFF** email confirmations
4. Save the changes

This allows users to immediately use the app after creating an account without needing to verify their email.

## Why This Is Needed

The simplified authentication flow uses email-based authentication (even though we show it as "username"). Supabase requires email signups to be enabled for the `signUp()` and `signInWithPassword()` functions to work.

## Alternative: Keep Email Confirmation

If you prefer to keep email confirmation enabled, users will need to:
1. Enter username and password
2. Check their email for a confirmation link
3. Click the confirmation link
4. Then return to the app

This is more secure but less user-friendly for quick testing and development.
