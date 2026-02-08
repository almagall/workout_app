#!/usr/bin/env node
/**
 * Build MuscleWiki video filename mapping by searching the MuscleWiki API.
 * Run: RAPIDAPI_KEY=your_key node scripts/build-musclewiki-mapping.mjs
 * Output: Prints mapping entries to add to lib/musclewiki-mapping.ts
 */

const API_KEY = process.env.RAPIDAPI_KEY ?? process.env.MUSCLEWIKI_RAPIDAPI_KEY
if (!API_KEY) {
  console.error('Set RAPIDAPI_KEY or MUSCLEWIKI_RAPIDAPI_KEY')
  process.exit(1)
}

const EXERCISES = [
  { id: 'bb-bench', name: 'Barbell Bench Press' },
  { id: 'incline-bb-bench', name: 'Incline Barbell Bench Press' },
  { id: 'db-bench', name: 'Dumbbell Bench Press' },
  { id: 'deadlift', name: 'Deadlift' },
  { id: 'bb-row', name: 'Barbell Row' },
  { id: 'ohp', name: 'Overhead Press' },
  { id: 'bb-squat', name: 'Barbell Squat' },
  { id: 'bb-curl', name: 'Barbell Curl' },
  { id: 'lat-pulldown', name: 'Lat Pulldown' },
  { id: 'leg-press', name: 'Leg Press' },
  { id: 'rdl', name: 'Romanian Deadlift' },
  { id: 'lateral-raise', name: 'Lateral Raise' },
  { id: 'tricep-pushdown', name: 'Tricep Pushdown' },
  { id: 'pull-up', name: 'Pull-Up' },
]

const headers = {
  'X-RapidAPI-Key': API_KEY,
  'X-RapidAPI-Host': 'musclewiki-api.p.rapidapi.com',
}

async function searchExercises(query) {
  const url = `https://musclewiki-api.p.rapidapi.com/search?q=${encodeURIComponent(query)}&limit=3`
  const res = await fetch(url, { headers })
  if (!res.ok) return []
  const data = await res.json()
  return data.results ?? []
}

async function getExerciseDetail(id) {
  const url = `https://musclewiki-api.p.rapidapi.com/exercises/${id}`
  const res = await fetch(url, { headers })
  if (!res.ok) return null
  return res.json()
}

async function main() {
  console.log('// Generated mapping - add to MUSCLEWIKI_VIDEO_FILENAMES in lib/musclewiki-mapping.ts\n')

  for (const ex of EXERCISES) {
    const results = await searchExercises(ex.name)
    if (results.length === 0) {
      console.log(`  // ${ex.id}: no match for "${ex.name}"`)
      continue
    }
    const detail = await getExerciseDetail(results[0].id)
    if (!detail?.videos?.length) {
      console.log(`  // ${ex.id}: "${ex.name}" has no videos`)
      continue
    }
    const filename = typeof detail.videos[0] === 'string' ? detail.videos[0] : detail.videos[0]?.filename ?? detail.videos[0]?.url?.split('/').pop()
    if (filename) {
      console.log(`  '${ex.id}': '${filename}',`)
    } else {
      console.log(`  // ${ex.id}: could not extract filename from`, JSON.stringify(detail.videos[0]).slice(0, 80))
    }
    await new Promise((r) => setTimeout(r, 200)) // rate limit
  }
}

main().catch(console.error)
