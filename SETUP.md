# Workout Planner App - Setup Guide

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Supabase account and project (already configured)

## Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Up Database**
   - Follow the instructions in `DATABASE_SETUP.md` to run the migration in your Supabase project
   - This creates all necessary tables and security policies

3. **Environment Variables**
   - The `.env.local` file is already configured with your Supabase credentials
   - Verify the values are correct:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`

4. **Run Development Server**
   ```bash
   npm run dev
   ```

5. **Open the App**
   - Navigate to http://localhost:3000
   - You should be redirected to the login page

## First-Time User Flow

1. **Sign Up**: Create a new account
2. **Select Plan**: Choose between Hypertrophy or Strength Training
3. **Create Template**: Set up your workout template with days and exercises
4. **Log Workouts**: Start logging your workouts and track progress
5. **View Dashboard**: See your progress over time

## Features

### Authentication
- Sign up / Sign in with Supabase Auth
- Protected routes with middleware
- Automatic session management

### Workout Templates
- Create custom workout templates
- Define multiple workout days (e.g., Push A, Pull B, Legs A)
- Add exercises to each day
- Templates are reusable week after week

### Workout Logging
- Select a template day to log
- Previous week's workout pre-populates automatically
- Progressive overload targets calculated automatically
- Real-time feedback after each exercise
- Overall workout feedback and rating

### Progressive Overload
- **Hypertrophy Plan**: Custom templates use e1RM-based double progression — targets always in 10-15 reps with weight derived from estimated 1RM so it is calibrated to current strength. Preset templates (5/3/1, PHUL, etc.) use their own rep ranges. Volume-focused progression.
- **Strength Plan**: Lower rep range (3-6), weight-focused progression
- Targets adjust based on performance
- Handles overperformance, met targets, and underperformance
- Gradual progression to avoid stagnation

### Dashboard
- Progress charts showing weight, reps, and volume over time
- Performance metrics (total workouts, volume, average rating, PRs)
- Exercise selector to filter progress by exercise

## Project Structure

```
workout_app/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Dashboard pages
│   ├── onboarding/       # Plan selection
│   └── workout/           # Workout logging and templates
├── components/            # React components
│   ├── dashboard/        # Dashboard components
│   └── workout/           # Workout logging components
├── lib/                   # Utility functions
│   ├── supabase/         # Supabase client setup
│   ├── progressive-overload.ts
│   └── feedback-generator.ts
├── types/                 # TypeScript type definitions
└── supabase/             # Database migrations
```

## Troubleshooting

### Database Connection Issues
- Verify your Supabase credentials in `.env.local`
- Check that the migration has been run successfully
- Ensure RLS policies are enabled

### Authentication Issues
- Clear browser cookies and try again
- Check Supabase Auth settings in dashboard
- Verify email confirmation is not required (or confirm your email)

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (should be 18+)
- Clear `.next` folder and rebuild

## Next Steps

- Customize the UI styling
- Add more chart types to the dashboard
- Implement exercise history view
- Add workout calendar view
- Export workout data functionality
