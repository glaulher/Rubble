import pb from '@/lib/pocketbase/client'

export interface SmtpSettings {
  id?: string
  configured: boolean
  host: string
  port: number
  username: string
  has_password?: boolean
  sender_address: string
  sender_name: string
  tls: boolean
  auth_method: 'PLAIN' | 'LOGIN'
  updated?: string
}

export interface SaveSmtpPayload {
  host: string
  port: number
  username?: string
  password?: string
  sender_address: string
  sender_name?: string
  tls: boolean
  auth_method?: 'PLAIN' | 'LOGIN'
}

export interface TestSmtpPayload {
  to: string
  host?: string
  port?: number
  username?: string
  password?: string
  sender_address?: string
  sender_name?: string
  tls?: boolean
  auth_method?: 'PLAIN' | 'LOGIN'
}

export const getSmtpSettings = async (): Promise<SmtpSettings> => {
  const res = await pb.send('/backend/v1/smtp-settings', {
    method: 'GET',
  })
  return res as SmtpSettings
}

export const saveSmtpSettings = async (
  payload: SaveSmtpPayload,
): Promise<{ success: boolean; message: string; data: SmtpSettings }> => {
  const res = await pb.send('/backend/v1/smtp-settings', {
    method: 'POST',
    body: payload,
  })
  return res as { success: boolean; message: string; data: SmtpSettings }
}

export const testSmtpConnection = async (
  payload: TestSmtpPayload,
): Promise<{ success: boolean; message: string }> => {
  const res = await pb.send('/backend/v1/smtp-settings/test', {
    method: 'POST',
    body: payload,
  })
  return res as { success: boolean; message: string }
}
