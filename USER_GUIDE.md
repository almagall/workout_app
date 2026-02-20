# Workout Planner - User Guide

## Overview

Workout Planner is an intelligent gym workout tracking application that helps you:
- Create and manage workout templates
- Log workouts with automatic progress tracking
- Get intelligent feedback and performance analysis
- Track your progress over time with visual charts
- Benefit from automatic progressive overload suggestions

The app uses smart algorithms to suggest weight and rep targets based on your previous performance, helping you avoid plateaus and continue making gains.

---

## Getting Started

### 1. Create Your Account

1. Visit the app and you'll see the **Sign In** page
2. Enter a **username** and **password** (minimum 6 characters)
3. Click **"Sign In"**
   - If the account doesn't exist, it will be created automatically
   - If it exists, you'll be signed in

### 2. Select Your Training Plan

After signing in, you'll be asked to choose between:

**Hypertrophy Training:**
- Custom templates: targets stay in 10-15 reps; the app recalculates weight when needed so 10-15 reps is achievable. Preset templates (e.g. 5/3/1, PHUL) use their program’s own rep ranges.
- Focus on volume progression
- Moderate intensity (RPE 6-8)
- Goal: Build muscle size and endurance

**Strength Training:**
- Lower rep range (3-6 reps)
- Focus on weight progression
- Higher intensity (RPE 7-9)
- Goal: Build maximum strength

**Note:** Your choice determines how the progressive overload algorithm calculates your targets.

### 3. Create Your Workout Template

A template defines your weekly workout structure. You create it once and reuse it every week.

**Steps:**
1. Click **"Create Template"** in the navigation
2. Enter a template name (e.g., "6-Day Push/Pull/Legs")
3. Click **"Add Day"** for each day you train
4. For each day:
   - Enter a label (e.g., "Push A", "Pull B", "Legs A")
   - Click **"+ Add Exercise"** to add exercises
   - Enter exercise names (e.g., "Bench Press", "Overhead Press", "Dips")
   - You can remove exercises with the "×" button
5. Click **"Create Template"** to save

**Example Template Structure:**
```
Template: "6-Day Push/Pull/Legs"

Day 1 - Push A:
  - Bench Press
  - Overhead Press
  - Bodyweight Dips
  - Chest Flies
  - Lateral Raises
  - Tricep Pushdowns

Day 2 - Pull B:
  - Barbell Rows
  - Pull-ups
  - Bicep Curls
  ...

Day 3 - Legs A:
  - Squats
  - Romanian Deadlifts
  - Leg Press
  ...
```

**Important:**
- You can create multiple templates (e.g., "Cutting Phase", "Bulking Phase")
- Days are not tied to specific calendar days - you choose which day to do when logging
- Exercises are saved in the order you add them

---

## Logging Workouts

### Step 1: Select a Workout Day

1. Click **"Log Workout"** in the navigation
2. You'll see all your template days listed
3. Click on the day you want to log (e.g., "Push A")

### Step 2: Set the Workout Date

1. At the top right, you'll see a **date picker**
2. By default, it's set to today's date
3. You can select any past date to:
   - Log a workout you missed
   - Backfill historical data
   - Correct a date if you forgot to log earlier

**Note:** You cannot log workouts for future dates.

### Step 3: Log Your Exercises

For each exercise in your template:

1. **View Previous Performance** (if available):
   - The app shows what you did last time you did this workout day
   - It displays suggested targets based on your plan type and previous performance

2. **Enter Your Sets:**
   - **Weight** (in lbs)
   - **Reps** (number of repetitions)
   - **RPE** (Rate of Perceived Exertion, 1-10 scale)
     - 1 = Very easy
     - 5 = Moderate
     - 10 = Maximum effort

3. **Add More Sets:**
   - Click **"+ Add Set"** if you need more sets
   - Click **"Remove Set"** to delete a set

4. **Complete the Exercise:**
   - Click **"Complete Exercise"** after finishing an exercise
   - You'll see immediate feedback about your performance

5. **Move to Next Exercise:**
   - Click **"Next Exercise"** to continue
   - Or **"Previous"** to go back

### Step 4: Complete the Workout

1. After logging all exercises, click **"Complete Workout"**
2. The app will:
   - Calculate your overall performance rating (1-10)
   - Generate overall feedback
   - Save all your data
3. You'll see a summary with your rating and feedback

---

## How Progressive Overload Works

### First Workout (Baseline)
- No targets are set
- You log your actual performance
- This establishes your baseline

### Subsequent Workouts
The app automatically:

1. **Finds Your Last Performance:**
   - Looks for the most recent time you did this specific workout day
   - Not tied to calendar days - if you did "Push A" 2 weeks ago, it finds that
   - Works even if you skip weeks or change days

2. **Calculates Targets:**
   - Based on your plan type (Hypertrophy vs Strength)
   - Based on your previous performance
   - Adjusts for overperformance, met targets, or underperformance

3. **Pre-populates Your Workout:**
   - Shows what you did last time
   - Displays suggested targets for this workout
   - You can see: "Target: 185 lbs × 10 reps @ RPE 8"

4. **Adjusts Based on Performance:**
   - **If you overperformed:** Targets increase gradually (2.5-5% weight or +1-2 reps)
   - **If you met targets:** Slight increase (1-2.5% weight or +1 rep)
   - **If you underperformed:** 
     - First time: Maintains same targets, provides feedback
     - Second consecutive: Slight reduction (2.5-5% weight or -1-2 reps)
     - Multiple times: Deload week (10-15% reduction)

### Example Progressive Overload Flow

**Week 1 - Push A (Baseline):**
- Bench Press: 135 lbs × 12 reps @ RPE 7
- No targets shown

**Week 2 - Push A (1 week later):**
- Previous: 135 lbs × 12 reps @ RPE 7
- **Target:** 140 lbs × 12 reps @ RPE 8
- **You did:** 140 lbs × 12 reps @ RPE 8
- **Result:** Met target! ✅

**Week 3 - Push A (2 weeks later, you skipped a week):**
- Previous: 140 lbs × 12 reps @ RPE 8 (from 2 weeks ago)
- **Target:** 145 lbs × 12 reps @ RPE 8
- **You did:** 145 lbs × 13 reps @ RPE 7
- **Result:** Overperformed! 🎉
- **Next week target will be:** 150 lbs × 12 reps @ RPE 8

---

## Dashboard Features

### Progress Charts

1. Click **"Dashboard"** in the navigation
2. View your progress over time:
   - **Weight:** Average weight lifted over time
   - **Reps:** Average reps performed over time
   - **Volume:** Total volume (weight × reps) over time
3. Use the **Exercise Selector** to filter by specific exercise
4. See trends and identify when you're making progress

### Performance Metrics

View key statistics:
- **Total Workouts:** Number of workouts logged
- **Total Volume:** Cumulative weight × reps across all workouts
- **Average Rating:** Your average performance rating
- **Personal Records:** Number of exercises where you've hit new max weights

---

## Key Features Explained

### Date Tracking

- Each workout is stored with a **workout_date** (the date you performed it)
- You can log workouts for any past date
- Historical tracking is based on the actual workout date, not when you logged it
- Charts and progress tracking use these dates chronologically

### Workout Day Matching

- The app finds your previous workout by **workout day type** (e.g., "Push A")
- Not by calendar day or fixed intervals
- If you did "Push A" on Monday, then again 2 weeks later on Wednesday, it finds the Monday workout
- Works regardless of schedule changes or missed weeks

### Feedback System

**Exercise-Level Feedback:**
- Provided after completing each exercise
- Compares your performance to targets
- Gives specific advice based on your plan type

**Workout-Level Feedback:**
- Provided after completing the entire workout
- Overall performance rating (1-10)
- Summary of how you did across all exercises
- Actionable suggestions for improvement

### Plan-Specific Logic

**Hypertrophy Plan:**
- Focuses on volume (weight × reps)
- Custom templates: targets in 10-15 rep range (weight recalculated when needed); presets use their program’s rep ranges.
- Moderate RPE (6-8)
- Gradual weight increases when hitting rep targets

**Strength Plan:**
- Focuses on weight progression
- Targets lower rep ranges (3-6)
- Higher RPE (7-9)
- More aggressive weight increases
- Prioritizes strength gains over volume

---

## Tips for Best Results

1. **Be Consistent:** Log workouts regularly for accurate progress tracking
2. **Be Honest with RPE:** Accurate RPE helps the algorithm adjust properly
3. **Follow Targets:** The suggested targets are based on science-backed progressive overload
4. **Review Feedback:** Pay attention to exercise and workout feedback
5. **Use the Dashboard:** Regularly check your progress charts to see trends
6. **Log Same Day:** Try to log workouts on the day you do them for best accuracy
7. **Don't Skip Too Many Weeks:** While the system handles it, consistency yields better results

---

## Navigation

- **Dashboard:** View progress charts and metrics
- **Log Workout:** Select a template day and log your workout
- **Create Template:** Set up new workout templates
- **Sign Out:** Log out of your account

---

## Troubleshooting

**Can't see my previous workout?**
- Make sure you've logged at least one workout for that template day before
- Check that you're selecting the correct template day

**Targets seem too high/low?**
- The system adjusts automatically based on your performance
- If you consistently underperform, targets will decrease
- If you consistently overperform, targets will increase

**Want to change my plan type?**
- Currently, plan type is set during onboarding
- You can create a new account or contact support to change it

**Can't log a workout?**
- Make sure you've created a template first
- Check that you've selected a valid date (not in the future)

---

## Data Privacy

- All your workout data is stored securely
- Only you can see your own workouts and progress
- Data is isolated per user account

---

This app is designed to make progressive overload automatic and intelligent, so you can focus on your workouts while the app handles the tracking and planning.
