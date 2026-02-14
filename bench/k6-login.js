import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 100,
  duration: '3m',
}

export default function () {
  const idx = Math.floor(Math.random() * 25) + 1
  const email = `user${idx}@example.com`
  const password = `Passw0rd${idx}!`
  const initRes = http.post('http://localhost:8000/api/login/init', JSON.stringify({ email }), { headers: { 'Content-Type': 'application/json' } })
  check(initRes, { 'init 200': (r) => r.status === 200 })
  const { challenge_id, salt_hex, nonce_hex } = initRes.json()

  const proveRes = http.post('http://localhost:8000/api/login/prove', JSON.stringify({ email, challenge_id, password }), { headers: { 'Content-Type': 'application/json' } })
  check(proveRes, { 'prove 200': (r) => r.status === 200 })
  const receipt_b64 = proveRes.json('receipt_b64')
  check(proveRes, { 'receipt present': () => !!receipt_b64 })

  const compRes = http.post('http://localhost:8000/api/login/complete', JSON.stringify({ email, challenge_id, receipt_b64 }), { headers: { 'Content-Type': 'application/json' } })
  check(compRes, { 'complete ok': (r) => r.status === 200 })
  sleep(1)
}
