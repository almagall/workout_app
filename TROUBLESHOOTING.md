# Troubleshooting: App Works Locally But Not on Vercel

## Common Causes

### 1. **Missing Environment Variables** (Most Common)

**Symptom:** App loads but features don't work, or you see errors about Supabase connection.

**Solution:**
1. Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
2. Make sure these are set for **Production**, **Preview**, and **Development**:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://igsoxjeailmyrwhfjdda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc294amVhaWxteXJ3aGZqZGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTg4OTUsImV4cCI6MjA4NDkzNDg5NX0.zbwJhqqannBA81XTYqB7VlsO83LIM_r-UHJ8JbZY5AA
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc294amVhaWxteXJ3aGZqZGRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1ODg5NSwiZXhwIjoyMDg0OTM0ODk1fQ.fXXuAVOkzC9bmNCHQ1WJuyIv1vN7cdDMvUhH_czRQE4
   ```
3. After adding/updating, **redeploy** your app (Vercel will do this automatically or you can trigger it manually)

### 2. **Check Browser Console for Errors**

**How to Debug:**
1. Open your deployed app in a browser
2. Open Developer Tools (F12 or Right-click → Inspect)
3. Go to **Console** tab
4. Look for red error messages
5. Common errors:
   - `NEXT_PUBLIC_SUPABASE_URL is not defined` → Environment variable missing
   - `Failed to fetch` → CORS or connection issue
   - `401 Unauthorized` → Auth issue

### 3. **Check Network Tab**

1. Open Developer Tools → **Network** tab
2. Try to use a feature (e.g., create template)
3. Look for failed requests (red status codes)
4. Check the error message in the response

### 4. **Verify Build Succeeded**

1. Go to Vercel Dashboard → **Deployments**
2. Check if the latest deployment shows ✅ (green) or ❌ (red)
3. If red, click on it to see build logs
4. Fix any build errors shown

### 5. **Runtime vs Build-Time Errors**

- **Build errors:** Show during deployment, prevent app from deploying
- **Runtime errors:** App deploys but doesn't work when you use it

**For Runtime Errors:**
- Check browser console (F12)
- Check Vercel Function Logs (Dashboard → Your Project → Functions tab)

## Quick Diagnostic Checklist

- [ ] Environment variables are set in Vercel (all 3: Production, Preview, Development)
- [ ] Build succeeded (green checkmark in Deployments)
- [ ] No errors in browser console
- [ ] Database migration has been run in Supabase
- [ ] Supabase email signups are enabled (if using Supabase auth)

## What to Check First

1. **Environment Variables** - This is the #1 cause
2. **Browser Console** - See what specific error is happening
3. **Vercel Function Logs** - Check server-side errors

## Getting More Help

If you're still stuck, share:
1. The error message from browser console
2. Whether the build succeeded or failed
3. What specific feature isn't working
4. Screenshot of the error (if possible)
