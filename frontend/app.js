const API_BASE = document.body.getAttribute('data-api-base') || ''

const sessionCard = document.getElementById('session-card')
const sessionEmail = document.getElementById('session-email')
const logoutBtn = document.getElementById('logout-btn')
const refreshBtn = document.getElementById('refresh-btn')

const registerCard = document.getElementById('register-card')
const regEmail = document.getElementById('reg-email')
const regPassword = document.getElementById('reg-password')
const regInitBtn = document.getElementById('reg-init-btn')
const regCommitBtn = document.getElementById('reg-commit-btn')
const regSalt = document.getElementById('reg-salt')
const regSaltText = document.getElementById('reg-salt-text')
const regStatus = document.getElementById('reg-status')
const regError = document.getElementById('reg-error')

const loginCard = document.getElementById('login-card')
const loginEmail = document.getElementById('login-email')
const loginPassword = document.getElementById('login-password')
const loginInitBtn = document.getElementById('login-init-btn')
const loginChallenge = document.getElementById('login-challenge')
const loginSalt = document.getElementById('login-salt')
const loginNonce = document.getElementById('login-nonce')
const loginChallengeId = document.getElementById('login-challenge-id')
const loginReceiptField = document.getElementById('login-receipt-field')
const loginReceipt = document.getElementById('login-receipt')
const loginActions = document.getElementById('login-actions')
const loginCompleteBtn = document.getElementById('login-complete-btn')
const loginResetBtn = document.getElementById('login-reset-btn')
const loginStatus = document.getElementById('login-status')
const loginError = document.getElementById('login-error')

const state = {
  me: { authenticated: false },
  register: { saltHex: null, loading: false },
  login: { saltHex: null, nonceHex: null, challengeId: null, loading: false }
}

function show(el, visible) {
  if (!el) return
  el.hidden = !visible
}

function setText(el, value) {
  if (!el) return
  el.textContent = value || ''
  show(el, Boolean(value))
}

function setButtonLoading(button, loading, loadingLabel, defaultLabel) {
  if (!button) return
  button.disabled = loading
  button.textContent = loading ? loadingLabel : defaultLabel
}

async function apiRequest(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })

  let data = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const error = new Error((data && data.error) || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}

async function refreshSession() {
  try {
    const data = await apiRequest('GET', '/api/me')
    state.me = data || { authenticated: false }
  } catch {
    state.me = { authenticated: false }
  }
  renderAuth()
}

function renderAuth() {
  const authenticated = Boolean(state.me && state.me.authenticated)
  show(sessionCard, authenticated)
  show(registerCard, !authenticated)
  show(loginCard, !authenticated)
  if (authenticated) {
    sessionEmail.textContent = state.me.sub || ''
  }
}

function renderRegister() {
  const hasSalt = Boolean(state.register.saltHex)
  show(regCommitBtn, hasSalt)
  show(regSalt, hasSalt)
  regSaltText.textContent = state.register.saltHex || ''
  setButtonLoading(regInitBtn, state.register.loading, 'Initializing...', 'Init registration')
  setButtonLoading(regCommitBtn, state.register.loading, 'Committing...', 'Commit')
}

function renderLogin() {
  const hasChallenge = Boolean(state.login.challengeId)
  show(loginChallenge, hasChallenge)
  show(loginReceiptField, hasChallenge)
  show(loginActions, hasChallenge)
  loginSalt.textContent = state.login.saltHex || ''
  loginNonce.textContent = state.login.nonceHex || ''
  loginChallengeId.textContent = state.login.challengeId || ''
  setButtonLoading(loginInitBtn, state.login.loading, 'Starting challenge...', 'Init login')
  setButtonLoading(loginCompleteBtn, state.login.loading, 'Completing...', 'Complete login')
}

function clearRegisterMessages() {
  setText(regStatus, '')
  setText(regError, '')
}

function clearLoginMessages() {
  setText(loginStatus, '')
  setText(loginError, '')
}

async function handleRegisterInit() {
  clearRegisterMessages()
  const email = regEmail.value.trim().toLowerCase()
  if (!email) {
    setText(regError, 'Email is required.')
    return
  }

  state.register.loading = true
  renderRegister()
  try {
    const data = await apiRequest('POST', '/api/register/init', { email })
    state.register.saltHex = data.salt_hex
  } catch (err) {
    setText(regError, err.message || 'Failed to init registration.')
  } finally {
    state.register.loading = false
    renderRegister()
  }
}

async function handleRegisterCommit() {
  clearRegisterMessages()
  const email = regEmail.value.trim().toLowerCase()
  const password = regPassword.value
  if (!email) {
    setText(regError, 'Email is required.')
    return
  }
  if (!password) {
    setText(regError, 'Password is required to compute commitment.')
    return
  }
  if (!state.register.saltHex) {
    setText(regError, 'Salt missing. Initialize registration first.')
    return
  }

  state.register.loading = true
  renderRegister()
  try {
    const commitmentHex = await computeCommitment(state.register.saltHex, password)
    await apiRequest('POST', '/api/register/commit', {
      email,
      salt_hex: state.register.saltHex,
      commitment_hex: commitmentHex
    })
    setText(regStatus, 'Registered! You can now start a login challenge.')
  } catch (err) {
    setText(regError, err.message || 'Failed to commit registration.')
  } finally {
    state.register.loading = false
    renderRegister()
  }
}

async function handleLoginInit() {
  clearLoginMessages()
  const email = loginEmail.value.trim().toLowerCase()
  if (!email) {
    setText(loginError, 'Email is required.')
    return
  }

  state.login.loading = true
  renderLogin()
  try {
    const data = await apiRequest('POST', '/api/login/init', { email })
    state.login.saltHex = data.salt_hex
    state.login.nonceHex = data.nonce_hex
    state.login.challengeId = data.challenge_id
    loginReceipt.value = ''
  } catch (err) {
    setText(loginError, err.message || 'Failed to init login.')
  } finally {
    state.login.loading = false
    renderLogin()
  }
}

async function handleLoginComplete() {
  clearLoginMessages()
  const email = loginEmail.value.trim().toLowerCase()
  const password = loginPassword.value
  const receiptInput = loginReceipt.value.trim()

  if (!state.login.challengeId || !state.login.saltHex || !state.login.nonceHex) {
    setText(loginError, 'Start a login challenge first.')
    return
  }

  state.login.loading = true
  renderLogin()
  let receiptB64 = receiptInput || ''

  if (!receiptB64 && password) {
    try {
      const data = await apiRequest('POST', '/api/login/prove', {
        email,
        challenge_id: state.login.challengeId,
        password
      })
      receiptB64 = data.receipt_b64 || ''
      if (receiptB64) loginReceipt.value = receiptB64
    } catch (err) {
      if (err.status === 403) {
        setText(loginError, 'Dev prover is disabled. Paste a receipt from prover-cli.')
      } else {
        setText(loginError, err.message || 'Prover failed to generate a receipt.')
      }
    }
  }

  if (!receiptB64) {
    setText(loginError, 'Receipt required to complete login.')
    state.login.loading = false
    renderLogin()
    return
  }

  try {
    await apiRequest('POST', '/api/login/complete', {
      email,
      challenge_id: state.login.challengeId,
      receipt_b64: receiptB64
    })
    setText(loginStatus, 'Logged in!')
    await refreshSession()
  } catch (err) {
    setText(loginError, err.message || 'Login failed.')
  } finally {
    state.login.loading = false
    renderLogin()
  }
}

function resetLoginChallenge() {
  state.login.saltHex = null
  state.login.nonceHex = null
  state.login.challengeId = null
  loginReceipt.value = ''
  clearLoginMessages()
  renderLogin()
}

async function handleLogout() {
  try {
    await apiRequest('POST', '/api/logout', {})
  } catch {
    // Ignore logout errors to avoid trapping the UI.
  } finally {
    await refreshSession()
  }
}

async function computeCommitment(saltHex, password) {
  const encoder = new TextEncoder()
  const pwBytes = encoder.encode(password)
  const saltBytes = hexToBytes(saltHex)
  const data = new Uint8Array(saltBytes.length + pwBytes.length)
  data.set(saltBytes)
  data.set(pwBytes, saltBytes.length)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return bytesToHex(new Uint8Array(digest))
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

regInitBtn.addEventListener('click', handleRegisterInit)
regCommitBtn.addEventListener('click', handleRegisterCommit)
loginInitBtn.addEventListener('click', handleLoginInit)
loginCompleteBtn.addEventListener('click', handleLoginComplete)
loginResetBtn.addEventListener('click', resetLoginChallenge)
logoutBtn.addEventListener('click', handleLogout)
refreshBtn.addEventListener('click', refreshSession)

renderRegister()
renderLogin()
refreshSession()