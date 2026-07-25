import { useState } from 'react'
import Setup from './screens/Setup'
import Dashboard from './screens/Dashboard'
import { api } from './services/api'

export default function App() {
  const [registered, setRegistered] = useState(api.isRegistered())
  return registered
    ? <Dashboard />
    : <Setup onDone={() => setRegistered(true)} />
}
