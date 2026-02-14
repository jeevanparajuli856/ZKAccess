import React, { useState } from 'react'
import axios from 'axios'

export function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saltHex, setSaltHex] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  const init = async () => {
    setStatus('')
    const r = await axios.post('/api/register/init', { email })
    setSaltHex(r.data.salt_hex)
  }

  const commit = async () => {
    if (!saltHex) return
    // Compute commitment locally (sha256(salt||password)) just for registration
    const encoder = new TextEncoder()
    const pwBytes = encoder.encode(password)
    const saltBytes = hexToBytes(saltHex)
    const data = new Uint8Array(saltBytes.length + pwBytes.length)
    data.set(saltBytes)
    data.set(pwBytes, saltBytes.length)
    const digest = await crypto.subtle.digest('SHA-256', data)
    const digestHex = bytesToHex(new Uint8Array(digest))

    await axios.post('/api/register/commit', { email, salt_hex: saltHex, commitment_hex: digestHex })
    setStatus('Registered!')
  }

  return (
    <div>
      <h2>Register</h2>
      <input placeholder='email' value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder='password' type='password' value={password} onChange={e => setPassword(e.target.value)} />
      <div>
        {!saltHex ? <button onClick={init}>Init</button> : <>
          <div>salt: <code>{saltHex}</code></div>
          <button onClick={commit}>Commit</button>
        </>}
      </div>
      {status && <p>{status}</p>}
    </div>
  )
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i*2, 2), 16)
  return bytes
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}
