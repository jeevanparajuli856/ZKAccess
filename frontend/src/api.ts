import axios from 'axios'

export const api = axios.create({ withCredentials: true })

export type RegisterInitResp = { email: string, salt_hex: string }
export type LoginInitResp = { email: string, challenge_id: string, salt_hex: string, nonce_hex: string }
