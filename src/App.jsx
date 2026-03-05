import { useState, useEffect } from 'react'
import {
  Scale,
  TrendingUp,
  AlertTriangle,
  Users,
  HelpCircle,
  Settings,
  ArrowRight,
  X,
} from 'lucide-react'
import { Analytics } from '@vercel/analytics/react'
import './App.css'

const DEAL_TYPES = ['M&A', 'IPO', 'Leveraged Buyout', 'Cross-Border Acquisition', 'Debt Restructuring']
const JURISDICTIONS = ['United States', 'United Kingdom', 'European Union', 'Asia-Pacific', 'Middle East']
const SECTORS = ['Financial Services', 'Technology', 'Healthcare', 'Energy', 'Consumer']
const DEAL_SIZES = ['<$500M', '$500M–$2B', '$2B–$10B', '$10B+']

const SYSTEM_PROMPT = `You are JPMorgan's internal Deal Intelligence Agent. You are grounded in institutional knowledge, precise, and you output only valid JSON — no markdown, no code fences, no commentary.

Given deal inputs, respond with a single JSON object with exactly these keys (use these exact key names):

1. "regulatoryConstraints": array of 3–4 strings. Each string is one jurisdiction-specific regulatory consideration (e.g., antitrust, foreign investment review, sector rules).

2. "precedentTransactions": array of 2–3 objects. Each object has: "dealType" (string), "year" (string, e.g. "2022"), "size" (string, e.g. "$3.2B"), "outcomeNote" (string, one-line outcome).

3. "keyRiskFlags": array of 2–3 strings. Items the deal team should pressure-test before proceeding.

4. "suggestedSMEs": array of exactly 3 objects. Each has: "name" (string, full name), "title" (string, JPMorgan title), "pastDeal" (string, one-line relevant past deal), "contactAction" (string, e.g. "Schedule call"). These are fictional but realistic JPMorgan expert profiles.

5. "openQuestions": array of 3–4 strings. Questions the deal team should resolve in the next 48 hours.

Output only the JSON object, nothing else.`

// Headers must be ISO-8859-1; strip any other code points (e.g. from paste).
function toLatin1(str) {
  return String(str).replace(/[^\x00-\xFF]/g, '')
}

async function callAnthropic(apiKey, userMessage) {
  const safeKey = toLatin1(apiKey).trim()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': safeKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || res.statusText || `HTTP ${res.status}`)
  }
  const data = await res.json()
  let text = data.content?.[0]?.text ?? ''
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(text)
}

const LOADING_TEXT = 'Generating brief...'

function LoadingTyping({ active }) {
  const [chars, setChars] = useState(0)
  useEffect(() => {
    if (!active) return
    setChars(0)
    const total = LOADING_TEXT.length
    const id = setInterval(() => {
      setChars((c) => (c < total ? c + 1 : c))
    }, 80)
    return () => clearInterval(id)
  }, [active])
  if (!active) return null
  return (
    <div className="loading-typing">
      <span>{LOADING_TEXT.slice(0, chars)}</span>
      <span className="loading-dot" aria-hidden>.</span>
    </div>
  )
}

const CARD_ACCENTS = {
  regulatory: '#D97706',
  precedent: '#1E64FF',
  risk: '#DC2626',
  sme: '#059669',
  questions: '#7C3AED',
}

function DealBriefCards({ data }) {
  if (!data) return null
  const {
    regulatoryConstraints = [],
    precedentTransactions = [],
    keyRiskFlags = [],
    suggestedSMEs = [],
    openQuestions = [],
  } = data

  return (
    <>
      <div className="deal-card card-accent-regulatory">
        <div className="card-header">
          <span className="card-icon-wrap card-icon-amber">
            <Scale size={20} />
          </span>
          <h3>REGULATORY CONSTRAINTS</h3>
        </div>
        <ul className="bullet-list">
          {regulatoryConstraints.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="deal-card card-accent-precedent">
        <div className="card-header">
          <span className="card-icon-wrap card-icon-blue">
            <TrendingUp size={20} />
          </span>
          <h3>PRECEDENT TRANSACTIONS</h3>
        </div>
        <div className="precedent-table-wrap">
          <table className="precedent-table">
            <thead>
              <tr>
                <th>Deal</th>
                <th>Year</th>
                <th>Size</th>
                <th>Outcome</th>
              </tr>
            </thead>
            <tbody>
              {precedentTransactions.map((tx, i) => (
                <tr key={i}>
                  <td>{tx.dealType}</td>
                  <td>{tx.year}</td>
                  <td>{tx.size}</td>
                  <td>{tx.outcomeNote}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="deal-card card-accent-risk">
        <div className="card-header">
          <span className="card-icon-wrap card-icon-red">
            <AlertTriangle size={20} />
          </span>
          <h3>KEY RISK FLAGS</h3>
        </div>
        <ul className="bullet-list">
          {keyRiskFlags.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="deal-card card-accent-sme">
        <div className="card-header">
          <span className="card-icon-wrap card-icon-green">
            <Users size={20} />
          </span>
          <h3>SUGGESTED INTERNAL SMES</h3>
        </div>
        <div className="sme-row">
          {suggestedSMEs.map((sme, i) => (
            <div key={i} className="sme-tile">
              <div className="sme-avatar">{(sme.name || '?').charAt(0).toUpperCase()}</div>
              <strong className="sme-name">{sme.name}</strong>
              <span className="sme-title">{sme.title}</span>
              <a href="#" className="sme-connect" onClick={(e) => e.preventDefault()}>
                → Connect
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="deal-card card-accent-questions">
        <div className="card-header">
          <span className="card-icon-wrap card-icon-purple">
            <HelpCircle size={20} />
          </span>
          <h3>OPEN QUESTIONS</h3>
        </div>
        <ul className="bullet-list">
          {openQuestions.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    </>
  )
}

function Modal({ open, onClose, title, children, hideClose }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={hideClose ? undefined : onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          {!hideClose && (
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const [apiKey, setApiKey] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [firstLoadModalOpen, setFirstLoadModalOpen] = useState(true)
  const [dealType, setDealType] = useState('M&A')
  const [targetCompany, setTargetCompany] = useState('')
  const [jurisdiction, setJurisdiction] = useState('United States')
  const [sector, setSector] = useState('Financial Services')
  const [dealSize, setDealSize] = useState('$500M–$2B')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [brief, setBrief] = useState(null)
  const [settingsKeyInput, setSettingsKeyInput] = useState('')

  const hasApiKey = Boolean(apiKey.trim())

  const openSettings = () => {
    setSettingsKeyInput(apiKey)
    setSettingsOpen(true)
  }
  const saveSettings = () => {
    setApiKey(settingsKeyInput.trim())
    setSettingsOpen(false)
    if (settingsKeyInput.trim()) setFirstLoadModalOpen(false)
  }
  const saveFirstLoadKey = () => {
    setApiKey(settingsKeyInput.trim())
    if (settingsKeyInput.trim()) {
      setFirstLoadModalOpen(false)
    }
  }
  useEffect(() => {
    if (hasApiKey && firstLoadModalOpen) setFirstLoadModalOpen(false)
  }, [hasApiKey, firstLoadModalOpen])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!apiKey.trim()) {
      setFirstLoadModalOpen(true)
      setError('Please enter your Anthropic API key.')
      return
    }
    setError(null)
    setBrief(null)
    setLoading(true)
    const userMessage = [
      `Deal type: ${dealType}`,
      `Target company: ${targetCompany || '(not specified)'}`,
      `Target jurisdiction: ${jurisdiction}`,
      `Sector: ${sector}`,
      `Deal size: ${dealSize}`,
      `Brief context: ${context || '(none)'}`,
    ].join('\n')
    try {
      const data = await callAnthropic(apiKey.trim(), userMessage)
      setBrief(data)
    } catch (err) {
      setError(err.message || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <Analytics />
      <header className="header">
        <div className="header-inner">
          <div className="logo-block">
            <h1 className="logo-text">Deal Intelligence</h1>
            <p className="tagline">Powered by Glean · JPMorgan Internal</p>
          </div>
          <div className="header-actions">
            <span className={`status-pill ${hasApiKey ? 'status-live' : 'status-no-key'}`}>
              {hasApiKey ? '● Live' : '○ No Key'}
            </span>
            <button type="button" className="btn-gear" onClick={openSettings} aria-label="Settings">
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <Modal open={firstLoadModalOpen} onClose={() => {}} title="Enter API key to continue" hideClose>
        <p className="modal-desc">Add your Anthropic API key to use the Deal Intelligence Agent. It is stored only in this session.</p>
        <div className="modal-field">
          <label htmlFor="first-load-key">Anthropic API key</label>
          <input
            id="first-load-key"
            type="password"
            placeholder="sk-ant-..."
            value={settingsKeyInput}
            onChange={(e) => setSettingsKeyInput(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={saveFirstLoadKey}>
            Continue
          </button>
        </div>
      </Modal>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Settings">
        <div className="modal-field">
          <label htmlFor="settings-key">Anthropic API key</label>
          <input
            id="settings-key"
            type="password"
            placeholder="sk-ant-..."
            value={settingsKeyInput}
            onChange={(e) => setSettingsKeyInput(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={saveSettings}>
            Save
          </button>
        </div>
      </Modal>

      <main className="main">
        <section className="panel left-panel">
          <form onSubmit={handleSubmit} className="deal-form">
            <h2 className="panel-title">Deal Input</h2>
            <div className="field">
              <label>DEAL TYPE</label>
              <select value={dealType} onChange={(e) => setDealType(e.target.value)}>
                {DEAL_TYPES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>TARGET COMPANY NAME</label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
              />
            </div>
            <div className="field">
              <label>TARGET JURISDICTION</label>
              <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
                {JURISDICTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>SECTOR</label>
              <select value={sector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>DEAL SIZE</label>
              <select value={dealSize} onChange={(e) => setDealSize(e.target.value)}>
                {DEAL_SIZES.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>BRIEF DEAL CONTEXT</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="2–3 sentences on strategic rationale, timeline, or key concerns."
                rows={4}
              />
            </div>
            {error && <p className="error-msg">{error}</p>}
            <button type="submit" className="btn-generate" disabled={loading}>
              <span>Generate Deal Brief</span>
              <ArrowRight size={18} className="btn-arrow" />
            </button>
          </form>
        </section>

        <section className="panel right-panel">
          <h2 className="panel-title">Deal Brief</h2>
          <div className="cards">
            {loading && <LoadingTyping active />}
            {!loading && brief && <DealBriefCards data={brief} />}
            {!loading && !brief && !error && (
              <p className="placeholder-msg">Submit the form to generate a deal brief.</p>
            )}
            {!loading && !brief && error && (
              <p className="placeholder-msg error-msg">{error}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
