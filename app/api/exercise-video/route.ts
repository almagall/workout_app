import { NextRequest, NextResponse } from 'next/server'
import { MUSCLEWIKI_VIDEO_FILENAMES } from '@/lib/musclewiki-mapping'

const MUSCLEWIKI_BASE = 'https://musclewiki-api.p.rapidapi.com'
const MUSCLEWIKI_STREAM_BASE = `${MUSCLEWIKI_BASE}/stream/videos/branded`

/** Valid filename: alphanumeric, hyphens, dots only. No path traversal. */
function isValidFilename(filename: string): boolean {
  if (!filename || filename.length > 100) return false
  return /^[a-zA-Z0-9.-]+\.mp4$/.test(filename)
}

/** Extract video URL or filename from MuscleWiki API response. Videos have { url, angle, gender }. */
function extractVideoUrl(videos: unknown): string | null {
  if (!Array.isArray(videos) || videos.length === 0) return null
  const v = videos[0]
  if (typeof v === 'string' && v.includes('.mp4')) return v
  if (v && typeof v === 'object') {
    const obj = v as Record<string, unknown>
    const url = (obj.url ?? obj.filename ?? obj.src) as string | undefined
    if (typeof url === 'string' && url.includes('.mp4')) return url
  }
  return null
}

/** Resolve exercise name to MuscleWiki video URL via API. Returns full URL to proxy. */
async function resolveVideoUrlFromApi(exerciseName: string, apiKey: string): Promise<string | null> {
  const headers = {
    'X-RapidAPI-Key': apiKey,
    'X-RapidAPI-Host': 'musclewiki-api.p.rapidapi.com',
  }
  const searchRes = await fetch(
    `${MUSCLEWIKI_BASE}/search?q=${encodeURIComponent(exerciseName)}&limit=1`,
    { headers }
  )
  if (!searchRes.ok) return null
  const searchData = await searchRes.json()
  // Search returns array directly (per OpenAPI) or { results: [...] }
  const results = Array.isArray(searchData) ? searchData : (searchData?.results ?? [])
  if (!results?.length) return null
  const first = results[0] as { id?: number }
  const exerciseId = first.id
  if (exerciseId == null) return null
  const detailRes = await fetch(`${MUSCLEWIKI_BASE}/exercises/${exerciseId}`, { headers })
  if (!detailRes.ok) return null
  const detail = (await detailRes.json()) as { videos?: unknown }
  return extractVideoUrl(detail.videos)
}

/** GET /api/exercise-video?exerciseName=xxx OR ?filename=xxx - Proxy MuscleWiki video stream */
export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.RAPIDAPI_KEY ?? process.env.MUSCLEWIKI_RAPIDAPI_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API not configured' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const exerciseName = searchParams.get('exerciseName')
    let streamUrl: string

    if (exerciseName) {
      const videoUrl = await resolveVideoUrlFromApi(exerciseName, apiKey)
      if (!videoUrl || !videoUrl.startsWith('https://musclewiki-api.p.rapidapi.com/')) {
        return NextResponse.json({ error: 'Video not found for exercise' }, { status: 404 })
      }
      streamUrl = videoUrl
    } else {
      const filename = searchParams.get('filename')
      if (!filename) {
        return NextResponse.json({ error: 'exerciseName or filename required' }, { status: 400 })
      }
      if (!isValidFilename(filename)) {
        return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
      }
      const allowedFilenames = new Set(Object.values(MUSCLEWIKI_VIDEO_FILENAMES))
      if (!allowedFilenames.has(filename)) {
        return NextResponse.json({ error: 'Unknown exercise video' }, { status: 404 })
      }
      streamUrl = `${MUSCLEWIKI_STREAM_BASE}/${filename}`
    }

    const headers: Record<string, string> = {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'musclewiki-api.p.rapidapi.com',
    }
    const range = request.headers.get('range')
    if (range) headers['Range'] = range

    const res = await fetch(streamUrl, { headers })

    if (!res.ok) {
      return NextResponse.json({ error: 'Video not found' }, { status: res.status === 404 ? 404 : 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'video/mp4'

    return new NextResponse(res.body, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 1 day
        ...(res.headers.get('content-range') && { 'Content-Range': res.headers.get('content-range')! }),
        ...(res.headers.get('accept-ranges') && { 'Accept-Ranges': res.headers.get('accept-ranges')! }),
      },
    })
  } catch (e) {
    console.error('Exercise video proxy error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
