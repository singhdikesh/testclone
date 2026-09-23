declare global {
  namespace google.accounts.id {
    type CredentialResponse = { credential: string }
    type Configuration = {
      client_id: string
      callback: (response: CredentialResponse) => void
    }
    function initialize(configuration: Configuration): void
    function renderButton(element: HTMLElement, options: Record<string, string>): void
  }

  interface Window {
    google?: typeof google
  }
}

export {}