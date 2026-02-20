# Workout Planner - High-Level Overview

## What Is This App?

An intelligent workout tracking system that automatically suggests weight and rep targets based on your previous performance, helping you progress without plateaus.

---

## Core Concept

**Create a template once → Log workouts weekly → App tracks progress and suggests targets automatically**

---

## Key Features

### 1. **Workout Templates**
- Define your weekly workout structure (e.g., "Push A", "Pull B", "Legs A")
- Add exercises to each day
- Reuse the same template every week
- No need to re-enter exercises each time

### 2. **Intelligent Workout Logging**
- Select a template day to log
- Previous workout data pre-populates automatically
- See suggested targets based on your plan and past performance
- Log sets with weight, reps, and RPE (Rate of Perceived Exertion)

### 3. **Automatic Progressive Overload**
- **First workout:** No targets (establishes baseline)
- **Subsequent workouts:** 
  - Finds your last performance for that workout day
  - Calculates suggested targets
  - Adjusts based on whether you overperformed, met, or underperformed
- **Smart adjustments:**
  - Overperformed → Increase targets gradually
  - Met targets → Slight increase
  - Underperformed → Maintain or reduce targets

### 4. **Progress Dashboard**
- Visual charts showing weight, reps, and volume over time
- Performance metrics (total workouts, volume, ratings, PRs)
- Filter by exercise to see specific progress

### 5. **Real-Time Feedback**
- Exercise-level feedback after each exercise
- Workout-level feedback and rating after completion
- Actionable suggestions for improvement

---

## User Flow

```
1. Sign In
   ↓
2. Select Plan (Hypertrophy or Strength)
   ↓
3. Create Workout Template
   - Add workout days (e.g., "Push A", "Pull B")
   - Add exercises to each day
   ↓
4. Log Workouts
   - Select template day
   - Choose date (today or past)
   - Log sets (weight, reps, RPE)
   - Get feedback
   ↓
5. View Progress
   - Check dashboard for charts and metrics
   - See how you're progressing over time
```

---

## How Progressive Overload Works

### Week 1 (Baseline)
- Log your workout
- No targets shown
- Establishes baseline

### Week 2+
- App finds your last workout for that day
- Shows what you did last time
- Suggests targets based on:
  - Your plan type (Hypertrophy vs Strength)
  - Your previous performance
  - Progressive overload principles

### Smart Adjustments
- **Overperformed?** → Targets increase (2.5-5% weight or +1-2 reps)
- **Met targets?** → Slight increase (1-2.5% weight or +1 rep)
- **Underperformed?** → Maintain or reduce (prevents injury, allows recovery)

---

## Plan Types

### Hypertrophy Training
- **Rep Range (custom templates):** 10-15 reps. Targets are derived from your estimated 1RM (e1RM) so the suggested weight is always calibrated to your current strength at the chosen rep count — not a raw percentage of the previous weight. Double progression: build reps to 15, then raise e1RM and reset to 10.
- **Preset templates** (e.g. 5/3/1, PHUL): use their program-specific rep ranges.
- **Focus:** Volume progression (weight × reps)
- **RPE:** 6-8 (moderate intensity)
- **Goal:** Build muscle size

### Strength Training
- **Rep Range:** 3-6 reps
- **Focus:** Weight progression
- **RPE:** 7-9 (higher intensity)
- **Goal:** Build maximum strength

---

## Important Concepts

### Workout Day Matching
- The app finds your previous workout by **workout day type** (e.g., "Push A")
- **Not** by calendar day or fixed intervals
- Example: If you did "Push A" on Monday, then again 2 weeks later on Wednesday, it finds the Monday workout
- Works regardless of schedule changes

### Date Flexibility
- Log workouts for any past date
- Useful for backfilling missed workouts
- Historical tracking based on workout date, not log date

### Template-Based System
- Create template once
- Reuse every week
- No need to manually set up exercises each workout
- Can create multiple templates for different phases

---

## Example Use Case

**Monday - Create Template:**
- Template: "6-Day Push/Pull/Legs"
- Day 1: "Push A" with Bench, Overhead Press, Dips, etc.

**Monday - Log First Workout:**
- Select "Push A"
- Log: Bench 135 lbs × 12 reps @ RPE 7
- No targets (first time)

**Next Monday - Log Second Workout:**
- Select "Push A" again
- App shows: Last time you did 135 lbs × 12 reps @ RPE 7
- **Target:** 140 lbs × 12 reps @ RPE 8
- You do: 140 lbs × 12 reps @ RPE 8
- Feedback: "Great job hitting your targets!"

**Following Monday - Log Third Workout:**
- App shows: Last time 140 lbs × 12 reps @ RPE 8
- **Target:** 145 lbs × 12 reps @ RPE 8
- You do: 145 lbs × 13 reps @ RPE 7
- Feedback: "Excellent! You exceeded targets. Next week we'll increase to 150 lbs."
- Progressive overload continues automatically!

---

## Benefits

✅ **Saves Time:** No need to remember what you did last week  
✅ **Prevents Plateaus:** Automatic progressive overload suggestions  
✅ **Tracks Progress:** Visual charts show your improvement  
✅ **Smart Feedback:** Get actionable advice after each workout  
✅ **Flexible:** Works with any schedule, not tied to specific days  
✅ **Plan-Specific:** Different logic for hypertrophy vs strength training  

---

## Quick Start Checklist

- [ ] Sign in with username and password
- [ ] Select training plan (Hypertrophy or Strength)
- [ ] Create workout template with days and exercises
- [ ] Log your first workout (establishes baseline)
- [ ] Log subsequent workouts (see targets and progress)
- [ ] Check dashboard to view progress over time

---

For detailed instructions, see `USER_GUIDE.md`
