# Deploying to Vercel

This guide will walk you through deploying your Workout Planner app to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com - it's free)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)
3. Your Supabase project set up and database migration run

## Step 1: Push Your Code to Git

If you haven't already, initialize a git repository and push to GitHub/GitLab/Bitbucket:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Workout Planner app"

# Add your remote repository (replace with your repo URL)
git remote add origin https://github.com/yourusername/workout_app.git

# Push to GitHub
git push -u origin main
```

**Important:** Make sure `.env.local` is in `.gitignore` (it should be by default) - never commit your environment variables!

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel:**
   - Visit https://vercel.com
   - Sign in (or create an account if you don't have one)

2. **Import Your Project:**
   - Click **"Add New..."** → **"Project"**
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Select your repository

3. **Configure Project:**
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** `./` (leave as default)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `npm install` (default)

4. **Add Environment Variables:**
   Click **"Environment Variables"** and add:
   
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://igsoxjeailmyrwhfjdda.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc294amVhaWxteXJ3aGZqZGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNTg4OTUsImV4cCI6MjA4NDkzNDg5NX0.zbwJhqqannBA81XTYqB7VlsO83LIM_r-UHJ8JbZY5AA
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlnc294amVhaWxteXJ3aGZqZGRhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTM1ODg5NSwiZXhwIjoyMDg0OTM0ODk1fQ.fXXuAVOkzC9bmNCHQ1WJuyIv1vN7cdDMvUhH_czRQE4
   ```
   
   **Important:** 
   - Add these for **Production**, **Preview**, and **Development** environments
   - The `NEXT_PUBLIC_` prefix means these are exposed to the browser (safe for anon key)
   - The service role key is server-side only

5. **Deploy:**
   - Click **"Deploy"**
   - Wait for the build to complete (usually 1-2 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Set up environment variables when prompted

4. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

## Step 3: Configure Environment Variables in Vercel

After deployment, you can update environment variables:

1. Go to your project in Vercel dashboard
2. Click **Settings** → **Environment Variables**
3. Add or update variables as needed
4. Redeploy for changes to take effect

## Step 4: Update Supabase Settings (If Needed)

### CORS Configuration

Vercel will give you a domain like `https://your-app.vercel.app`. You may need to:

1. Go to Supabase Dashboard → **Settings** → **API**
2. Add your Vercel domain to allowed origins (if CORS issues occur)
3. Usually not needed, but good to know

### Database Connection

Your Supabase database should work as-is since it's a public URL. No changes needed.

## Step 5: Test Your Deployment

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. Test the full flow:
   - Sign in
   - Select plan
   - Create template
   - Log workout
   - View dashboard

## Continuous Deployment

Once connected to Git:
- **Automatic:** Every push to `main` branch deploys to production
- **Preview:** Pull requests get preview deployments
- **Rollback:** Easy rollback to previous deployments

## Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel handles SSL certificates automatically

## Troubleshooting

### Build Fails

**Common issues:**
- Missing environment variables → Add them in Vercel dashboard
- TypeScript errors → Fix in local, then push
- Missing dependencies → Check `package.json`

**Check build logs:**
- Go to **Deployments** → Click on failed deployment → View logs

### App Works Locally But Not on Vercel

1. **Check environment variables** are set correctly
2. **Check build logs** for errors
3. **Verify Supabase connection** (check network tab in browser)
4. **Check browser console** for client-side errors

### Database Connection Issues

- Verify Supabase URL and keys are correct
- Check Supabase dashboard for any restrictions
- Ensure database migration has been run

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side) | Optional* |

*Service role key is only needed if you have server-side operations that bypass RLS. With the current simple auth system, it may not be needed, but it's good to have it set.

## Next Steps After Deployment

1. ✅ Test all features on the live site
2. ✅ Share your app URL with users
3. ✅ Monitor deployments in Vercel dashboard
4. ✅ Set up custom domain (optional)
5. ✅ Configure analytics (optional)

## Vercel Free Tier Limits

- **Bandwidth:** 100GB/month
- **Builds:** Unlimited
- **Serverless Functions:** 100GB-hours/month
- **More than enough for most apps!**

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
