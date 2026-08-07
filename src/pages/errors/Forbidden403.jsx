import { ShieldAlert } from 'lucide-react'
import ErrorPage from './ErrorPage'
export default function Forbidden403() {
  return <ErrorPage code={403} icon={ShieldAlert} title="Access denied" text="Your role doesn't have permission to view this page." />
}
