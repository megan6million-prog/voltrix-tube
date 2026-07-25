import { useEffect, useState } from 'react'
import { api } from './src/services/api'
import Setup from './src/screens/Setup'
import Dashboard from './src/screens/Dashboard'

export default function App() {
  const [registered, setRegistered] = useState(null)

  useEffect(() => {
    api.isRegistered().then(setRegistered)
  }, [])

  if (registered === null) return null // splash
  return registered
    ? <Dashboard />
    : <Setup onDone={() => setRegistered(true)} />
}
