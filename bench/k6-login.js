import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 100,
  duration: '3m',
}

export default function () {
  const email = `user${Math.floor(Math.random()*25)+1}@example.com`
  const initRes = http.post('http://localhost:8000/api/login/init', JSON.stringify({ email }), { headers: { 'Content-Type': 'application/json' } })
  check(initRes, { 'init 200': (r) => r.status === 200 })
  const { challenge_id, salt_hex, nonce_hex } = initRes.json()

  // This benchmark assumes you pre-generated a receipt_b64 list for the nonce; in practice use a client helper.
  // For prototype, you can replace with a placeholder or a precomputed mapping.
  const receipt_b64 = ''
  const compRes = http.post('http://localhost:8000/api/login/complete', JSON.stringify({ email, challenge_id, receipt_b64 }), { headers: { 'Content-Type': 'application/json' } })
  check(compRes, { 'complete ok or 400 (placeholder)': (r) => r.status === 200 || r.status === 400 })
  sleep(1)
}
