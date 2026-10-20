import { useEffect, useRef, useState } from 'react'
import { api, setToken } from '../api'
import { APP_NAME } from '../constants'
import './Login.css'

export function Login({ onLogin }) {
  const buttonRef = useRef(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

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
          size: 'small',
          shape: 'pill',
          text: 'signin',
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

  async function handlePasswordLogin(e) {
    e.preventDefault()
    setError('')
    try {
      const result = await api.login(username, password)
      setToken(result.jwt_token)
      onLogin()
    } catch (err) {
      setError('Invalid username or password')
    }
  }

  return (
    <div className="login-page">
      <h1>{APP_NAME}</h1>
      <p>Sign in to continue</p>

      <form className="login-password-form" onSubmit={handlePasswordLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="login-error">{error}</p>}
        <button type="submit">Sign in</button>
      </form>

      <div className="login-google-hint">
        <span>Are you an admin?</span>
        <div ref={buttonRef} />
      </div>
    </div>
  )
}
