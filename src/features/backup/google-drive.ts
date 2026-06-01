// Uses Google Identity Services (GSI) loaded via <script> in layout
// and the Drive API v3 REST endpoints via fetch.

const SCOPES = 'https://www.googleapis.com/auth/drive.appdata'

let accessToken: string | null = null

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; error?: string }) => void
          }) => { requestAccessToken: () => void }
        }
      }
    }
  }
}

export async function signInWithGoogle(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error(response.error))
          return
        }
        accessToken = response.access_token!
        resolve(accessToken)
      },
    })
    client.requestAccessToken()
  })
}

export function getAccessToken(): string | null {
  return accessToken
}

async function driveRequest(path: string, options: RequestInit = {}): Promise<Response> {
  if (!accessToken) throw new Error('Not authenticated with Google Drive')
  return fetch(`https://www.googleapis.com/drive/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers ?? {}),
    },
  })
}

export interface DriveFile {
  id: string
  name: string
  createdTime: string
}

export async function listBackupFiles(): Promise<DriveFile[]> {
  const res = await driveRequest(
    "/files?spaces=appDataFolder&fields=files(id,name,createdTime)&q=name+contains+'bp-backup'"
  )
  if (!res.ok) throw new Error(`Drive list failed: ${res.statusText}`)
  const json = (await res.json()) as { files: DriveFile[] }
  return json.files
}

export async function uploadBackup(content: string, filename: string): Promise<void> {
  const metadata = { name: filename, parents: ['appDataFolder'] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'application/json' }))
  const res = await driveRequest('/files?uploadType=multipart', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Drive upload failed: ${res.statusText}`)
}

export async function downloadBackup(fileId: string): Promise<string> {
  const res = await driveRequest(`/files/${fileId}?alt=media`)
  if (!res.ok) throw new Error(`Drive download failed: ${res.statusText}`)
  return res.text()
}
