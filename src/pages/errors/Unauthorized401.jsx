import { LockKeyhole } from 'lucide-react'
import ErrorPage from './ErrorPage'
export default function Unauthorized401() {
  return <ErrorPage code={401} icon={LockKeyhole} title="Sign in required" text="You need to sign in to view this page." />
}
