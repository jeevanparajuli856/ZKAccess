import React, { useState } from 'react'
import axios from 'axios'

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saltHex, setSaltHex] = useState<string | null>(null)
  const [nonceHex, setNonceHex] = useState<string | null>(null)
  const [challengeId, setChallengeId] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const init = async () => {
    setStatus('')
    const r = await axios.post('/api/login/init', { email })
    setSaltHex(r.data.salt_hex)
    setNonceHex(r.data.nonce_hex)
    setChallengeId(r.data.challenge_id)
  }

  const complete = async () => {
    if (!saltHex || !nonceHex || !challengeId) return

    // For demo: call local prover CLI via backend in future.
    // Here we just show the flow; in a real demo, you'd run prover-cli manually
    // and paste the receipt, or the frontend would call a local client helper.
    const receiptB64 = prompt('Paste receipt_b64 from prover-cli')
    if (!receiptB64) return

    await axios.post('/api/login/complete', { email, challenge_id: challengeId, receipt_b64: receiptB64 }, { withCredentials: true })
    setStatus('Logged in!')
    onSuccess()
  }

  return (
    <div>
      <h2>Login</h2>
      <input placeholder='email' value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder='password' type='password' value={password} onChange={e => setPassword(e.target.value)} />
      <div>
        {!challengeId ? <button onClick={init}>Init</button> : <>
          <div><small>salt: <code>{saltHex}</code></small></div>
          <div><small>nonce: <code>{nonceHex}</code></small></div>
          <button onClick={complete}>Complete (paste receipt)</button>
        </>}
      </div>
      {status && <p>{status}</p>}
    </div>
  )
}
