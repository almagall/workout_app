/**
 * Exercise database for autocomplete when creating/editing custom templates.
 * Existing templates keep their free-text exercise names; no migration needed.
 */

export interface ExerciseEntry {
  id: string
  name: string
  muscleGroup: string
  equipment: string
  description: string
  secondaryMuscleGroups?: string[]
}

const EXERCISES: ExerciseEntry[] = [
  // Chest
  { id: 'bb-bench', name: 'Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', description: 'Lie on a flat bench and lower a barbell to your mid-chest, then press it back up. Builds chest, triceps, and front deltoids.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'incline-bb-bench', name: 'Incline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', description: 'Press a barbell from an inclined bench (30–45 degrees) to emphasize the upper chest and front deltoids.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'decline-bb-bench', name: 'Decline Barbell Bench Press', muscleGroup: 'Chest', equipment: 'Barbell', description: 'Press a barbell from a decline bench to target the lower chest. Keep your feet secured and lower the bar to your lower chest.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'db-bench', name: 'Dumbbell Bench Press', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'Press dumbbells from a flat bench, allowing a greater range of motion than the barbell. Builds chest with independent arm control.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'Press dumbbells from an inclined bench to focus on the upper chest and front deltoids.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'decline-db-press', name: 'Decline Dumbbell Press', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'Press dumbbells from a decline bench to target the lower chest and triceps.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'db-fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'Lie on a bench with arms extended, then lower dumbbells out to the sides in a wide arc. Isolates the chest with a stretch at the bottom.', secondaryMuscleGroups: [] },
  { id: 'incline-db-fly', name: 'Incline Dumbbell Fly', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'Perform a fly motion on an incline bench to emphasize the upper chest and front deltoids.', secondaryMuscleGroups: ['Shoulders'] },
  { id: 'chest-fly', name: 'Chest Fly', muscleGroup: 'Chest', equipment: 'Dumbbell', description: 'A horizontal fly movement with dumbbells to isolate the pecs. Keep a slight bend in the elbows throughout.', secondaryMuscleGroups: [] },
  { id: 'cable-fly', name: 'Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', description: 'Pull cable handles together from a high or low position. Constant tension targets the chest throughout the movement.', secondaryMuscleGroups: [] },
  { id: 'cable-crossover', name: 'Cable Crossover', muscleGroup: 'Chest', equipment: 'Cable', description: 'Cross cables in front of your chest from high or low pulleys. Adjustable angle lets you target different chest regions.', secondaryMuscleGroups: [] },
  { id: 'low-cable-fly', name: 'Low Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', description: 'Fly the cables from a low position, bringing hands together in front of your chest. Targets upper chest and inner pecs.', secondaryMuscleGroups: [] },
  { id: 'high-cable-fly', name: 'High Cable Fly', muscleGroup: 'Chest', equipment: 'Cable', description: 'Fly cables from a high position, bringing hands down and together. Emphasizes the lower chest.', secondaryMuscleGroups: [] },
  { id: 'pec-deck', name: 'Pec Deck', muscleGroup: 'Chest', equipment: 'Machine', description: 'Sit at the pec deck machine and squeeze the pads or handles together in front of your chest. Isolates the pecs with controlled resistance.', secondaryMuscleGroups: [] },
  { id: 'cable-chest-fly', name: 'Cable Chest Fly', muscleGroup: 'Chest', equipment: 'Cable', description: 'Stand between cable stacks and bring the handles together in front of your chest in a fly motion. Constant tension and adjustable pulley height let you target upper or lower chest; keep a slight bend in the elbows.', secondaryMuscleGroups: [] },
  { id: 'machine-chest-fly', name: 'Machine Chest Fly', muscleGroup: 'Chest', equipment: 'Machine', description: 'Sit at the chest fly machine and push the arms or pads through an arc in front of your chest. Plate-loaded or pin-loaded; isolates the pecs with a fixed path and controlled resistance.', secondaryMuscleGroups: [] },
  { id: 'chest-press-machine', name: 'Chest Press Machine', muscleGroup: 'Chest', equipment: 'Machine', description: 'Push the machine handles forward from a seated position. Provides a stable chest press with guided movement.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'push-up', name: 'Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Lower your chest toward the floor with hands shoulder-width apart, then push back up. Classic compound move for chest, triceps, and core.', secondaryMuscleGroups: ['Triceps', 'Shoulders', 'Core'] },
  { id: 'dips', name: 'Dips', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Support yourself on parallel bars, lower until upper arms are parallel to the floor, then push up. Targets chest and triceps.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'dips-chest', name: 'Chest Dips', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Dips performed with a forward lean to emphasize the chest. Lean forward and keep elbows out to target pecs.', secondaryMuscleGroups: ['Triceps', 'Shoulders'] },
  { id: 'diamond-push-up', name: 'Diamond Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Place hands close together under your chest in a diamond shape. Emphasizes triceps and inner chest.', secondaryMuscleGroups: ['Triceps', 'Shoulders', 'Core'] },
  { id: 'incline-push-up', name: 'Incline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Hands on an elevated surface (bench or wall) with feet on the floor. Easier variation that targets upper chest.', secondaryMuscleGroups: ['Triceps', 'Shoulders', 'Core'] },
  { id: 'decline-push-up', name: 'Decline Push-Up', muscleGroup: 'Chest', equipment: 'Bodyweight', description: 'Feet elevated on a bench or box, hands on the floor. Increases difficulty and targets upper chest and shoulders.', secondaryMuscleGroups: ['Triceps', 'Shoulders', 'Core'] },
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back', equipment: 'Barbell', description: 'Hinge at the hips to lower a barbell toward the floor with a flat back, then drive through your heels to stand. Targets the entire posterior chain—lower back, glutes, and hamstrings.', secondaryMuscleGroups: ['Legs', 'Core'] },
  { id: 'bb-row', name: 'Barbell Row', muscleGroup: 'Back', equipment: 'Barbell', description: 'Hinge forward and pull a barbell toward your lower chest, squeezing your shoulder blades. Builds lats, rhomboids, and traps.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'pendlay-row', name: 'Pendlay Row', muscleGroup: 'Back', equipment: 'Barbell', description: 'Row a barbell from the floor to your chest, letting it touch the ground between reps. Explosive row that builds middle back strength.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 't-bar-row', name: 'T-Bar Row', muscleGroup: 'Back', equipment: 'Barbell', description: 'Row a loaded T-bar or landmine toward your chest while braced. Favors the lats and mid-back with adjustable grip.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'db-row', name: 'Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell', description: 'Support on a bench and row one dumbbell to your hip, then repeat on the other side. Unilateral movement for lats and rhomboids.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'single-arm-db-row', name: 'Single Arm Dumbbell Row', muscleGroup: 'Back', equipment: 'Dumbbell', description: 'Row one dumbbell at a time with a neutral grip. Allows a full range of motion and addresses imbalances.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'cable-row', name: 'Cable Row', muscleGroup: 'Back', equipment: 'Cable', description: 'Sit and pull a cable attachment toward your stomach, squeezing your shoulder blades. Constant tension for lats and middle back.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscleGroup: 'Back', equipment: 'Cable', description: 'Row a cable handle to your belly while seated. Targets lats, rhomboids, and rear delts with a stable base.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'cable-row-high', name: 'Cable Row (High)', muscleGroup: 'Back', equipment: 'Cable', description: 'Pull a high cable toward your chest with elbows out. Emphasizes upper back and rear deltoids.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable', description: 'Pull a bar down to your upper chest from a seated position. Builds lat width and upper back strength.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'wide-grip-pulldown', name: 'Wide Grip Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable', description: 'Pull a wide bar down with hands outside shoulder width. Emphasizes lat width and upper back.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'close-grip-pulldown', name: 'Close Grip Lat Pulldown', muscleGroup: 'Back', equipment: 'Cable', description: 'Pull a narrow bar or V-handle to your chest. Targets inner lats and biceps alongside the back.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'straight-arm-pulldown', name: 'Straight Arm Pulldown', muscleGroup: 'Back', equipment: 'Cable', description: 'Push a bar down with straight arms from overhead. Isolates the lats with minimal bicep involvement.', secondaryMuscleGroups: [] },
  { id: 'face-pull', name: 'Face Pull', muscleGroup: 'Back', equipment: 'Cable', description: 'Pull a rope or handles toward your face, externally rotating at the top. Builds rear delts, upper back, and rotator cuff health.', secondaryMuscleGroups: ['Shoulders'] },
  { id: 'pull-up', name: 'Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Hang from a bar and pull your chin over it. Fundamental back builder for lats, biceps, and grip.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'pull-up-assisted', name: 'Assisted Pull-Up', muscleGroup: 'Back', equipment: 'Machine', description: 'Use an assist machine or band to reduce bodyweight. Allows progression toward unassisted pull-ups.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'chin-up', name: 'Chin-Up', muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Pull-up with palms facing you. Places more emphasis on the biceps and lower lats.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'wide-grip-pull-up', name: 'Wide Grip Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Pull-up with hands wider than shoulder width. Targets outer lats and upper back.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'inverted-row', name: 'Inverted Row', muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Hang under a bar or TRX and pull your chest to your hands. Scalable row for back and biceps.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'australian-pull-up', name: 'Australian Pull-Up', muscleGroup: 'Back', equipment: 'Bodyweight', description: 'Horizontal pull-up with feet on the floor under a low bar. Beginner-friendly row that builds back strength.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  { id: 'rack-pull', name: 'Rack Pull', muscleGroup: 'Back', equipment: 'Barbell', description: 'Deadlift from pins or blocks set above the floor. Shorter range targets upper back, traps, and lockout strength.', secondaryMuscleGroups: ['Legs', 'Core'] },
  { id: 'machine-row', name: 'Machine Row', muscleGroup: 'Back', equipment: 'Machine', description: 'Row machine handles toward your torso from a seated position. Guided movement for consistent back development.', secondaryMuscleGroups: ['Biceps', 'Shoulders'] },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Press a barbell from the front of your shoulders to overhead. Core shoulder builder for delts and triceps.', secondaryMuscleGroups: ['Triceps', 'Core'] },
  { id: 'military-press', name: 'Military Press', muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Strict overhead press with feet together, often seated. Emphasizes strict form and shoulder strength.', secondaryMuscleGroups: ['Triceps', 'Core'] },
  { id: 'push-press', name: 'Push Press', muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Use leg drive to help press a barbell overhead. Allows heavier loads for overhead strength development.', secondaryMuscleGroups: ['Triceps', 'Legs', 'Core'] },
  { id: 'db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Press dumbbells overhead from shoulder height. Independent arm movement builds balanced shoulder development.', secondaryMuscleGroups: ['Triceps', 'Core'] },
  { id: 'seated-db-press', name: 'Seated Dumbbell Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Press dumbbells overhead while seated. Removes leg drive for stricter shoulder isolation.', secondaryMuscleGroups: ['Triceps'] },
  { id: 'arnold-press', name: 'Arnold Press', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Rotate palms from front to back while pressing dumbbells overhead. Works all three delt heads through the movement.', secondaryMuscleGroups: ['Triceps', 'Chest'] },
  { id: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Raise dumbbells out to the sides until arms are parallel to the floor. Isolates the lateral deltoids.', secondaryMuscleGroups: [] },
  { id: 'cable-lateral-raise', name: 'Cable Lateral Raise', muscleGroup: 'Shoulders', equipment: 'Cable', description: 'Raise a cable handle out to the side. Constant tension targets the lateral delts.', secondaryMuscleGroups: [] },
  { id: 'front-raise', name: 'Front Raise', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Raise dumbbells forward to shoulder height. Isolates the anterior deltoids.', secondaryMuscleGroups: [] },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Bend forward and raise dumbbells out to the sides. Targets the rear deltoids and upper back.', secondaryMuscleGroups: ['Back'] },
  { id: 'reverse-fly', name: 'Reverse Fly', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Bend at the hips and fly dumbbells backward. Builds rear delts and improves posture.', secondaryMuscleGroups: ['Back'] },
  { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', muscleGroup: 'Shoulders', equipment: 'Machine', description: 'Sit and pull the machine handles apart behind you. Isolates rear delts with guided movement.', secondaryMuscleGroups: ['Back'] },
  { id: 'upright-row', name: 'Upright Row', muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Pull a barbell up along your body to shoulder height. Targets traps and lateral delts; use a moderate grip to reduce impingement risk.', secondaryMuscleGroups: ['Back', 'Biceps'] },
  { id: 'shrug', name: 'Shrug', muscleGroup: 'Shoulders', equipment: 'Barbell', description: 'Hold a barbell and raise your shoulders toward your ears. Builds upper traps and neck musculature.', secondaryMuscleGroups: ['Back'] },
  { id: 'db-shrug', name: 'Dumbbell Shrug', muscleGroup: 'Shoulders', equipment: 'Dumbbell', description: 'Hold dumbbells at your sides and shrug your shoulders up. Allows a greater range of motion than the barbell shrug.', secondaryMuscleGroups: ['Back'] },
  { id: 'shoulder-press-machine', name: 'Shoulder Press Machine', muscleGroup: 'Shoulders', equipment: 'Machine', description: 'Press machine handles overhead from a seated position. Guided movement for consistent delt development.', secondaryMuscleGroups: ['Triceps'] },
  { id: 'pike-push-up', name: 'Pike Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight', description: 'Start in a pike position with hips high and perform push-ups. Targets shoulders with an inverted angle.', secondaryMuscleGroups: ['Triceps', 'Core'] },
  { id: 'handstand-push-up', name: 'Handstand Push-Up', muscleGroup: 'Shoulders', equipment: 'Bodyweight', description: 'Press up and down while in a handstand against a wall. Advanced shoulder builder using full bodyweight.', secondaryMuscleGroups: ['Triceps', 'Core'] },
  // Arms - Biceps
  { id: 'bb-curl', name: 'Barbell Curl', muscleGroup: 'Biceps', equipment: 'Barbell', description: 'Curl a barbell from your thighs to your shoulders. Fundamental bicep builder with both arms working together.', secondaryMuscleGroups: [] },
  { id: 'ez-bar-curl', name: 'EZ Bar Curl', muscleGroup: 'Biceps', equipment: 'Barbell', description: 'Curl an EZ bar to emphasize the biceps. Angled grip can reduce wrist strain compared to a straight bar.', secondaryMuscleGroups: [] },
  { id: 'db-curl', name: 'Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', description: 'Curl dumbbells with palms up. Allows supination and a full range of motion for each arm.', secondaryMuscleGroups: [] },
  { id: 'alternating-db-curl', name: 'Alternating Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', description: 'Curl one dumbbell at a time while the other arm rests. Builds biceps with focused concentration per arm.', secondaryMuscleGroups: [] },
  { id: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', description: 'Curl dumbbells with a neutral grip (palms facing each other). Targets biceps and brachialis.', secondaryMuscleGroups: [] },
  { id: 'concentration-curl', name: 'Concentration Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', description: 'Seat with elbow braced against your thigh and curl one dumbbell. Isolates the bicep with minimal cheating.', secondaryMuscleGroups: [] },
  { id: 'preacher-curl', name: 'Preacher Curl', muscleGroup: 'Biceps', equipment: 'Barbell', description: 'Curl a barbell or EZ bar on a preacher bench. Eliminates body swing for strict bicep isolation.', secondaryMuscleGroups: [] },
  { id: 'incline-db-curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps', equipment: 'Dumbbell', description: 'Curl dumbbells while reclined on an incline bench. Stretches the biceps at the bottom for a full range.', secondaryMuscleGroups: [] },
  { id: 'cable-curl', name: 'Cable Curl', muscleGroup: 'Biceps', equipment: 'Cable', description: 'Curl a cable bar or handle. Constant tension throughout the movement targets the biceps.', secondaryMuscleGroups: [] },
  { id: 'cable-hammer-curl', name: 'Cable Hammer Curl', muscleGroup: 'Biceps', equipment: 'Cable', description: 'Curl cable handles with a neutral grip. Combines hammer curl emphasis with cable tension.', secondaryMuscleGroups: [] },
  { id: 'spider-curl', name: 'Spider Curl', muscleGroup: 'Biceps', equipment: 'Barbell', description: 'Curl a barbell or dumbbells while leaning over an incline bench. Isolates the biceps with arms hanging straight down.', secondaryMuscleGroups: [] },
  { id: '21s', name: '21s (Bicep)', muscleGroup: 'Biceps', equipment: 'Barbell', description: 'Perform 7 half-curls from the bottom, 7 from the top, then 7 full curls. Intense bicep burnout technique.', secondaryMuscleGroups: [] },
  // Arms - Triceps
  { id: 'tricep-pushdown', name: 'Tricep Pushdown', muscleGroup: 'Triceps', equipment: 'Cable', description: 'Push a cable bar or rope down with elbows at your sides. Isolates the triceps with constant tension.', secondaryMuscleGroups: [] },
  { id: 'rope-pushdown', name: 'Rope Pushdown', muscleGroup: 'Triceps', equipment: 'Cable', description: 'Push down a rope attachment and spread the ropes at the bottom. Targets the lateral tricep head.', secondaryMuscleGroups: [] },
  { id: 'overhead-tricep', name: 'Overhead Tricep Extension', muscleGroup: 'Triceps', equipment: 'Dumbbell', description: 'Hold a dumbbell overhead and lower it behind your head, then extend. Stretches and works the long tricep head.', secondaryMuscleGroups: [] },
  { id: 'cable-overhead-extension', name: 'Cable Overhead Extension', muscleGroup: 'Triceps', equipment: 'Cable', description: 'Extend a cable attachment from behind your head. Constant tension for the long head of the triceps.', secondaryMuscleGroups: [] },
  { id: 'skull-crusher', name: 'Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell', description: 'Lie and lower a barbell toward your forehead, then extend. Classic tricep builder; keep elbows stable.', secondaryMuscleGroups: [] },
  { id: 'ez-skull-crusher', name: 'EZ Bar Skull Crusher', muscleGroup: 'Triceps', equipment: 'Barbell', description: 'Skull crusher with an EZ bar for a more comfortable grip. Targets the triceps with reduced wrist strain.', secondaryMuscleGroups: [] },
  { id: 'close-grip-bench', name: 'Close-Grip Bench Press', muscleGroup: 'Triceps', equipment: 'Barbell', description: 'Bench press with hands closer than shoulder width. Compound movement that heavily involves the triceps.', secondaryMuscleGroups: ['Chest', 'Shoulders'] },
  { id: 'db-kickback', name: 'Dumbbell Kickback', muscleGroup: 'Triceps', equipment: 'Dumbbell', description: 'Hinge at the hip and extend the arm backward with a dumbbell. Isolates the triceps at full extension.', secondaryMuscleGroups: [] },
  { id: 'french-press', name: 'French Press', muscleGroup: 'Triceps', equipment: 'Barbell', description: 'Lower a barbell from overhead to behind your head with elbows in, then extend. Long-head tricep focus.', secondaryMuscleGroups: [] },
  { id: 'tricep-dips', name: 'Tricep Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight', description: 'Dips performed with an upright torso to emphasize triceps. Keep elbows back and close to your body.', secondaryMuscleGroups: ['Chest', 'Shoulders'] },
  { id: 'bench-dips', name: 'Bench Dips', muscleGroup: 'Triceps', equipment: 'Bodyweight', description: 'Support yourself on a bench and lower your body by bending the elbows, then push back up. Accessible tricep builder.', secondaryMuscleGroups: ['Chest', 'Shoulders'] },
  { id: 'diamond-pushup-tricep', name: 'Diamond Push-Up (Tricep)', muscleGroup: 'Triceps', equipment: 'Bodyweight', description: 'Push-up with hands in a diamond shape under your chest. Emphasizes the triceps and inner chest.', secondaryMuscleGroups: ['Chest', 'Shoulders', 'Core'] },
  // Legs - Quads/General
  { id: 'bb-squat', name: 'Barbell Squat', muscleGroup: 'Legs', equipment: 'Barbell', description: 'Stand with a barbell on your upper back, bend your knees and hips to lower until thighs are at least parallel, then drive back up. Fundamental lower body exercise for quads, glutes, and core.', secondaryMuscleGroups: ['Core'] },
  { id: 'back-squat', name: 'Back Squat', muscleGroup: 'Legs', equipment: 'Barbell', description: 'Squat with a barbell on your upper back (high or low bar). The primary lower body strength builder.', secondaryMuscleGroups: ['Core'] },
  { id: 'front-squat', name: 'Front Squat', muscleGroup: 'Legs', equipment: 'Barbell', description: 'Rest a barbell on your front delts and squat. Emphasizes quads and demands an upright torso.', secondaryMuscleGroups: ['Core'] },
  { id: 'goblet-squat', name: 'Goblet Squat', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Hold a dumbbell at your chest and squat. Teaches proper squat mechanics and builds quads and core.', secondaryMuscleGroups: ['Core'] },
  { id: 'hack-squat', name: 'Hack Squat', muscleGroup: 'Legs', equipment: 'Machine', description: 'Squat in a hack machine with your back against the pad and feet on the platform. Quad-focused with a guided path.', secondaryMuscleGroups: [] },
  { id: 'leg-press', name: 'Leg Press', muscleGroup: 'Legs', equipment: 'Machine', description: 'Push a weighted platform with your feet while seated. Builds quads and glutes with reduced spinal loading.', secondaryMuscleGroups: ['Core'] },
  { id: 'leg-extension', name: 'Leg Extension', muscleGroup: 'Legs', equipment: 'Machine', description: 'Extend your legs against resistance from a seated position. Isolates the quadriceps.', secondaryMuscleGroups: [] },
  { id: 'lunges', name: 'Lunges', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Step forward and lower your back knee toward the floor, then push back up. Unilateral leg builder for quads and glutes.', secondaryMuscleGroups: ['Core'] },
  { id: 'walking-lunge', name: 'Walking Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Lunge forward with each step, alternating legs. Builds leg strength and balance through movement.', secondaryMuscleGroups: ['Core'] },
  { id: 'reverse-lunge', name: 'Reverse Lunge', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Step backward into a lunge instead of forward. Often easier on the knees while targeting quads and glutes.', secondaryMuscleGroups: ['Core'] },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Rear foot elevated on a bench, lower into a single-leg squat. Intense unilateral exercise for quads and glutes.', secondaryMuscleGroups: ['Core'] },
  { id: 'step-up', name: 'Step-Up', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Step onto a bench or box with one leg, drive up, and step down. Builds single-leg strength and balance.', secondaryMuscleGroups: ['Core'] },
  { id: 'bodyweight-squat', name: 'Bodyweight Squat', muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Squat with no external load, focusing on depth and form. Foundation for all loaded squat variations.', secondaryMuscleGroups: ['Core'] },
  // Legs - Hamstrings/Glutes
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', equipment: 'Barbell', description: 'Hinge at the hips with a slight knee bend, lowering the bar along your legs. Targets hamstrings and glutes with a focus on the stretch.', secondaryMuscleGroups: ['Back', 'Core'] },
  { id: 'stiff-leg-deadlift', name: 'Stiff Leg Deadlift', muscleGroup: 'Legs', equipment: 'Barbell', description: 'Deadlift with straighter legs to emphasize hamstring lengthening. Keep the bar close to your legs.', secondaryMuscleGroups: ['Back', 'Core'] },
  { id: 'db-rdl', name: 'Dumbbell Romanian Deadlift', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'RDL with dumbbells for a greater range of motion. Builds hamstrings and glutes with easier setup.', secondaryMuscleGroups: ['Back', 'Core'] },
  { id: 'good-morning', name: 'Good Morning', muscleGroup: 'Legs', equipment: 'Barbell', description: 'With a barbell on your back, hinge at the hips until your torso is near horizontal. Targets hamstrings and lower back.', secondaryMuscleGroups: ['Back', 'Core'] },
  { id: 'leg-curl', name: 'Leg Curl', muscleGroup: 'Legs', equipment: 'Machine', description: 'Curl your heels toward your glutes against machine resistance. Isolates the hamstrings.', secondaryMuscleGroups: [] },
  { id: 'seated-leg-curl', name: 'Seated Leg Curl', muscleGroup: 'Legs', equipment: 'Machine', description: 'Curl your legs from a seated position. Emphasizes the lower hamstrings.', secondaryMuscleGroups: [] },
  { id: 'lying-leg-curl', name: 'Lying Leg Curl', muscleGroup: 'Legs', equipment: 'Machine', description: 'Lie face down and curl your heels toward your glutes. Targets the hamstrings with a stretched start position.', secondaryMuscleGroups: [] },
  { id: 'glute-bridge', name: 'Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Lie on your back, drive through your heels, and lift your hips. Activates the glutes with a safe movement pattern.', secondaryMuscleGroups: ['Core'] },
  { id: 'hip-thrust-bb', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Barbell', description: 'With your upper back on a bench, drive a barbell at your hips up by extending the hips. Primary glute builder.', secondaryMuscleGroups: ['Core'] },
  { id: 'hip-thrust-db', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Dumbbell', description: 'Hip thrust with a dumbbell held at the hips. Glute builder with a simpler setup than the barbell.', secondaryMuscleGroups: ['Core'] },
  { id: 'hip-thrust-machine', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Machine', description: 'Hip thrust on a dedicated machine. Provides guided resistance for glute development.', secondaryMuscleGroups: ['Core'] },
  { id: 'hip-thrust-bw', name: 'Hip Thrust', muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Hip thrust with no external load. Foundation for loaded hip thrusts and glute activation.', secondaryMuscleGroups: ['Core'] },
  { id: 'single-leg-glute-bridge', name: 'Single-Leg Glute Bridge', muscleGroup: 'Legs', equipment: 'Bodyweight', description: 'Glute bridge on one leg with the other extended. Increases glute demand and addresses leg imbalances.', secondaryMuscleGroups: ['Core'] },
  { id: 'cable-pull-through', name: 'Cable Pull Through', muscleGroup: 'Legs', equipment: 'Cable', description: 'Pull a cable between your legs from behind, hinging at the hips. Targets glutes and hamstrings with constant tension.', secondaryMuscleGroups: ['Back', 'Core'] },
  // Calves
  { id: 'calf-raise', name: 'Calf Raise', muscleGroup: 'Calves', equipment: 'Machine', description: 'Rise onto your toes against resistance, then lower with control. Builds the gastrocnemius and soleus.', secondaryMuscleGroups: [] },
  { id: 'standing-calf-raise', name: 'Standing Calf Raise', muscleGroup: 'Calves', equipment: 'Machine', description: 'Stand and rise onto your toes on a calf raise machine. Emphasizes the gastrocnemius.', secondaryMuscleGroups: [] },
  { id: 'seated-calf-raise', name: 'Seated Calf Raise', muscleGroup: 'Calves', equipment: 'Machine', description: 'Rise onto your toes from a seated position. Targets the soleus with a bent-knee position.', secondaryMuscleGroups: [] },
  { id: 'calf-raise-bw', name: 'Calf Raise (Bodyweight)', muscleGroup: 'Calves', equipment: 'Bodyweight', description: 'Rise onto your toes using bodyweight, optionally on a step for range. Accessible calf builder.', secondaryMuscleGroups: [] },
  // Core
  { id: 'ab-work', name: 'Ab Work', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'General category for abdominal exercises. Can include crunches, planks, and other core movements.', secondaryMuscleGroups: [] },
  { id: 'plank', name: 'Plank', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Hold a push-up position with arms straight or on forearms. Builds core stability and endurance.', secondaryMuscleGroups: ['Shoulders', 'Legs'] },
  { id: 'side-plank', name: 'Side Plank', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Hold your body in a straight line on one forearm and the side of your foot. Targets the obliques.', secondaryMuscleGroups: ['Shoulders'] },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and curl your shoulders toward your knees. Focuses on the rectus abdominis.', secondaryMuscleGroups: [] },
  { id: 'bicycle-crunch', name: 'Bicycle Crunch', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Alternate elbow-to-knee while pedaling your legs. Works the rectus abdominis and obliques together.', secondaryMuscleGroups: ['Legs'] },
  { id: 'russian-twist', name: 'Russian Twist', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Sit with feet elevated and rotate your torso side to side. Targets obliques and rotational core strength.', secondaryMuscleGroups: [] },
  { id: 'leg-raise', name: 'Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and raise your legs toward the ceiling. Targets the lower abs and hip flexors.', secondaryMuscleGroups: ['Legs'] },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Hang from a bar and raise your legs to horizontal or higher. Advanced lower ab and hip flexor exercise.', secondaryMuscleGroups: ['Legs', 'Back'] },
  { id: 'hanging-knee-raise', name: 'Hanging Knee Raise', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Hang and raise your knees toward your chest. Easier variation of the hanging leg raise.', secondaryMuscleGroups: ['Legs', 'Back'] },
  { id: 'ab-wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Kneel and roll an ab wheel forward, then pull back. Builds core stability and anti-extension strength.', secondaryMuscleGroups: ['Shoulders', 'Back'] },
  { id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', equipment: 'Cable', description: 'Pull a cable down by crunching your torso toward your knees. Adds resistance to the crunch movement.', secondaryMuscleGroups: [] },
  { id: 'wood-chop', name: 'Wood Chop', muscleGroup: 'Core', equipment: 'Cable', description: 'Rotate and pull a cable across your body in a chopping motion. Builds rotational core strength and obliques.', secondaryMuscleGroups: ['Shoulders', 'Legs'] },
  { id: 'pallof-press', name: 'Pallof Press', muscleGroup: 'Core', equipment: 'Cable', description: 'Hold a cable at your chest and press it straight out, resisting rotation. Anti-rotation core exercise.', secondaryMuscleGroups: ['Shoulders'] },
  { id: 'mountain-climber', name: 'Mountain Climber', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'From a plank, drive your knees toward your chest in alternation. Builds core endurance and coordination.', secondaryMuscleGroups: ['Shoulders', 'Legs'] },
  { id: 'dead-bug', name: 'Dead Bug', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and extend opposite arm and leg while keeping your lower back pressed down. Anti-extension core drill.', secondaryMuscleGroups: ['Legs'] },
  { id: 'bird-dog', name: 'Bird Dog', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'From all fours, extend one arm and the opposite leg. Builds core stability and low-back endurance.', secondaryMuscleGroups: ['Back', 'Legs'] },
  { id: 'l-sit', name: 'L-Sit', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Support yourself on parallel bars or the floor and hold your legs out in an L shape. Advanced core and hip flexor hold.', secondaryMuscleGroups: ['Legs', 'Shoulders'] },
  { id: 'sit-up', name: 'Sit-Up', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and sit up to touch your knees or beyond. Classic ab exercise; control the eccentric.', secondaryMuscleGroups: ['Legs'] },
  { id: 'v-up', name: 'V-Up', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and simultaneously lift your upper body and legs to form a V. Advanced full ab exercise.', secondaryMuscleGroups: ['Legs'] },
  { id: 'toe-touch', name: 'Toe Touch', muscleGroup: 'Core', equipment: 'Bodyweight', description: 'Lie on your back and reach your hands toward your toes while lifting your legs. Targets the upper and lower abs.', secondaryMuscleGroups: ['Legs'] },
]

/** Alternatives: same muscle group, similar movement. Key = exercise id, value = alternative exercise names. */
export const EXERCISE_ALTERNATIVES: Record<string, string[]> = {
  // Chest
  'bb-bench': ['Dumbbell Bench Press', 'Push-Up', 'Chest Press Machine'],
  'incline-bb-bench': ['Incline Dumbbell Press', 'Push-Up', 'Cable Fly'],
  'db-bench': ['Barbell Bench Press', 'Push-Up', 'Chest Press Machine'],
  'incline-db-press': ['Incline Barbell Bench Press', 'Cable Fly', 'Pec Deck'],
  'db-fly': ['Cable Fly', 'Cable Chest Fly', 'Pec Deck', 'Machine Chest Fly'],
  'cable-fly': ['Dumbbell Fly', 'Cable Chest Fly', 'Pec Deck', 'Cable Crossover'],
  'cable-chest-fly': ['Dumbbell Fly', 'Pec Deck', 'Cable Fly'],
  'machine-chest-fly': ['Dumbbell Fly', 'Pec Deck', 'Cable Fly'],
  'chest-fly': ['Dumbbell Fly', 'Cable Chest Fly', 'Machine Chest Fly'],
  'push-up': ['Barbell Bench Press', 'Dumbbell Bench Press', 'Dips'],
  'dips': ['Push-Up', 'Dumbbell Bench Press', 'Chest Press Machine'],
  'chest-press-machine': ['Barbell Bench Press', 'Dumbbell Bench Press', 'Push-Up'],
  // Back
  'deadlift': ['Romanian Deadlift', 'Rack Pull', 'Leg Press'],
  'bb-row': ['Dumbbell Row', 'Cable Row', 'T-Bar Row'],
  'db-row': ['Barbell Row', 'Cable Row', 'Machine Row'],
  'lat-pulldown': ['Pull-Up', 'Chin-Up', 'Seated Cable Row'],
  'pull-up': ['Lat Pulldown', 'Chin-Up', 'Inverted Row'],
  'chin-up': ['Pull-Up', 'Lat Pulldown', 'Inverted Row'],
  'cable-row': ['Barbell Row', 'Dumbbell Row', 'Machine Row'],
  'inverted-row': ['Pull-Up', 'Australian Pull-Up', 'Cable Row'],
  // Shoulders
  'ohp': ['Dumbbell Shoulder Press', 'Push Press', 'Shoulder Press Machine'],
  'military-press': ['Overhead Press', 'Dumbbell Shoulder Press', 'Push Press'],
  'db-shoulder-press': ['Overhead Press', 'Arnold Press', 'Shoulder Press Machine'],
  'lateral-raise': ['Cable Lateral Raise', 'Front Raise', 'Upright Row'],
  'rear-delt-fly': ['Reverse Pec Deck', 'Face Pull', 'Reverse Fly'],
  'reverse-pec-deck': ['Face Pull', 'Reverse Fly', 'Rear Delt Fly'],
  // Biceps
  'bb-curl': ['Dumbbell Curl', 'EZ Bar Curl', 'Cable Curl'],
  'db-curl': ['Barbell Curl', 'Hammer Curl', 'Cable Curl'],
  'hammer-curl': ['Dumbbell Curl', 'Cable Hammer Curl', 'Preacher Curl'],
  'preacher-curl': ['Barbell Curl', 'Concentration Curl', 'Cable Curl'],
  // Triceps
  'tricep-pushdown': ['Rope Pushdown', 'Skull Crusher', 'Close-Grip Bench Press'],
  'skull-crusher': ['Overhead Tricep Extension', 'Close-Grip Bench Press', 'Tricep Pushdown'],
  'close-grip-bench': ['Tricep Pushdown', 'Skull Crusher', 'Tricep Dips'],
  'tricep-dips': ['Bench Dips', 'Close-Grip Bench Press', 'Diamond Push-Up (Tricep)'],
  // Legs
  'bb-squat': ['Leg Press', 'Goblet Squat', 'Front Squat'],
  'back-squat': ['Barbell Squat', 'Leg Press', 'Front Squat'],
  'front-squat': ['Barbell Squat', 'Goblet Squat', 'Leg Press'],
  'leg-press': ['Barbell Squat', 'Hack Squat', 'Goblet Squat'],
  'rdl': ['Deadlift', 'Stiff Leg Deadlift', 'Dumbbell Romanian Deadlift'],
  'lunges': ['Bulgarian Split Squat', 'Walking Lunge', 'Step-Up'],
  'leg-curl': ['Romanian Deadlift', 'Seated Leg Curl', 'Lying Leg Curl'],
  'hip-thrust-bb': ['Glute Bridge', 'Hip Thrust (Dumbbell)', 'Cable Pull Through'],
  'calf-raise': ['Standing Calf Raise', 'Seated Calf Raise', 'Calf Raise (Bodyweight)'],
  // Core
  'plank': ['Dead Bug', 'Bird Dog', 'Side Plank'],
  'crunch': ['Bicycle Crunch', 'Cable Crunch', 'Sit-Up'],
  'leg-raise': ['Hanging Leg Raise', 'Hanging Knee Raise', 'Dead Bug'],
}

/** Get alternative exercises for a given exercise (by name). Returns names for display. */
export function getExerciseAlternatives(exerciseName: string): string[] {
  const entry = getExerciseByName(exerciseName)
  if (!entry) return []
  const alts = EXERCISE_ALTERNATIVES[entry.id]
  if (alts?.length) return alts
  // Fallback: same muscle group, exclude self
  return EXERCISES.filter(
    (e) => e.muscleGroup === entry.muscleGroup && e.name.toLowerCase() !== entry.name.toLowerCase()
  )
    .slice(0, 3)
    .map((e) => e.name)
}

/** Get alternatives with equipment for grouping/filtering in the UI. */
export function getExerciseAlternativesWithEquipment(exerciseName: string): { name: string; equipment: string }[] {
  const names = getExerciseAlternatives(exerciseName)
  return names.map((name) => {
    const entry = getExerciseByName(name)
    return { name, equipment: entry?.equipment ?? 'Other' }
  })
}

/** Search exercises by name (case-insensitive, substring). */
export function searchExercises(query: string, limit = 15): ExerciseEntry[] {
  if (!query.trim()) return EXERCISES.slice(0, limit)
  const q = query.trim().toLowerCase()
  return EXERCISES.filter((e) => e.name.toLowerCase().includes(q)).slice(0, limit)
}

/** Get exercise by exact name (case-insensitive). */
export function getExerciseByName(name: string): ExerciseEntry | null {
  if (!name.trim()) return null
  const n = name.trim().toLowerCase()
  return EXERCISES.find((e) => e.name.toLowerCase() === n) ?? null
}

/** Check if an exercise is bodyweight-only (equipment is 'Bodyweight'). */
export function isBodyweightExercise(name: string): boolean {
  const entry = getExerciseByName(name)
  return entry?.equipment === 'Bodyweight'
}

/** All exercises for dropdown when query is empty. */
export function getExerciseList(): ExerciseEntry[] {
  return [...EXERCISES]
}
