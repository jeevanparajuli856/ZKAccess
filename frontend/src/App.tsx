import React, { useEffect, useState } from 'react'
import { Login } from './Login'
import { Register } from './Register'
import axios from 'axios'

export default function App() {
  const [me, setMe] = useState<{authenticated: boolean, sub?: string} | null>(null)

  const refresh = async () => {
    try {
      const r = await axios.get('/api/me', { withCredentials: true })
      setMe(r.data)
    } catch {
      setMe({ authenticated: false })
    }
  }

  useEffect(() => { refresh() }, [])

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>ZKAccess</h1>
      {me?.authenticated ? (
        <div>
          <p>Welcome, {me.sub}</p>
          <button onClick={async () => { await axios.post('/api/logout', {}, { withCredentials: true }); await refresh() }}>Logout</button>
        </div>
      ) : (
        <>
          <Register />
          <hr />
          <Login onSuccess={refresh} />
        </>
      )}
    </div>
  )
}
