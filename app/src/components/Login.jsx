import { useEffect, useRef } from 'react'
import { api, setToken } from '../api'
import './Login.css'

export function Login({ onLogin }) {
  const buttonRef = useRef(null)

  useEffect(() => {
    api.getAuthConfig().then(({ google_client_id }) => {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.onload = () => {
        window.google.accounts.id.initialize({
          client_id: google_client_id,
          callback: handleCredentialResponse,
        })
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
        })
      }
      document.head.appendChild(script)
    })
  }, [])

  async function handleCredentialResponse(response) {
    try {
      const result = await api.authGoogle(response.credential)
      setToken(result.jwt_token)
      onLogin()
    } catch (err) {
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="login-page">
      <h1>Annotation</h1>
      <p>Sign in to continue</p>
      <div ref={buttonRef} />
    </div>
  )
}
