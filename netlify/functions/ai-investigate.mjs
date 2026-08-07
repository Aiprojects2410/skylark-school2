const REPO = 'Aiprojects2410/skylark-school2'
const MODEL = 'gpt-4o-mini'

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}

async function githubJson(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: { accept: 'application/vnd.github+json', 'user-agent': 'skylark-erp-ai-investigator' },
  })
  if (!response.ok) return null
  return response.json()
}

function keywords(ticket) {
  const text = `${ticket.subject || ''} ${ticket.description || ''} ${ticket.page_path || ''}`.toLowerCase()
  return [...new Set(text.match(/[a-z][a-z0-9_-]{3,}/g) || [])]
    .filter(x => !['this', 'that', 'with', 'from', 'when', 'what', 'error', 'issue', 'page', 'user', 'please'].includes(x))
    .slice(0, 18)
}

async function collectCode(ticket) {
  const tree = await githubJson(`/repos/${REPO}/git/trees/main?recursive=1`)
  if (!tree?.tree) return []
  const keys = keywords(ticket)
  const source = tree.tree.filter(item => item.type === 'blob' && /\.(jsx?|tsx?|ts|sql|mjs|json)$/.test(item.path) && !item.path.startsWith('dist/'))
  const scored = source.map(item => {
    const path = item.path.toLowerCase()
    const score = keys.reduce((n, key) => n + (path.includes(key) ? 4 : 0), 0)
    return { ...item, score }
  }).sort((a, b) => b.score - a.score)
  const selected = [...scored.filter(x => x.score > 0).slice(0, 8), ...scored.filter(x => x.score === 0).slice(0, 2)]
  const unique = [...new Map(selected.map(x => [x.path, x])).values()].slice(0, 10)
  const files = []
  for (const item of unique) {
    const blob = await githubJson(`/repos/${REPO}/git/blobs/${item.sha}`)
    if (!blob?.content) continue
    try {
      const text = Buffer.from(blob.content, 'base64').toString('utf8').slice(0, 14000)
      files.push({ path: item.path, score: item.score, content: text })
    } catch {}
  }
  return files
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const ticket = await req.json()
    if (!ticket?.description) return json({ error: 'Ticket description is required.' }, 400)
    const code = await collectCode(ticket)
    const baseUrl = process.env.OPENAI_BASE_URL
    if (!baseUrl) return json({ error: 'Netlify AI Gateway is not enabled for this site yet.' }, 503)

    const prompt = `You are the senior debugging assistant for Skylark School ERP. Investigate the support ticket using the ticket context and the supplied repository snippets. Do not invent files, database facts, or logs. Be conservative and explicit about uncertainty. Return ONLY valid JSON with this exact shape: {"summary":"","root_cause":"","confidence":0,"priority":"low|medium|high","risk_level":"low|medium|high","affected_files":["path"],"recommendation":"","next_checks":["check"]}. Confidence is 0-100. Do not propose destructive database operations.

TICKET:
${JSON.stringify(ticket, null, 2)}

REPOSITORY SNIPPETS:
${code.map(f => `FILE: ${f.path}\n${f.content}`).join('\n\n---\n\n')}`

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, temperature: 0.1, messages: [
        { role: 'system', content: 'You diagnose software tickets. Output JSON only.' },
        { role: 'user', content: prompt },
      ] }),
    })
    const raw = await response.text()
    if (!response.ok) return json({ error: `AI provider error (${response.status})`, details: raw.slice(0, 500) }, 502)
    const payload = JSON.parse(raw)
    const content = payload?.choices?.[0]?.message?.content || ''
    const cleaned = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim()
    const result = JSON.parse(cleaned)
    return json({ ...result, analyzed_files: code.map(f => f.path), model: MODEL })
  } catch (error) {
    return json({ error: error?.message || 'AI investigation failed.' }, 500)
  }
}

export const config = { path: '/api/ai-investigate' }
