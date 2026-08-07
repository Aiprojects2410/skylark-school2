import { SearchX } from 'lucide-react'
import ErrorPage from './ErrorPage'
export default function NotFound404() {
  return <ErrorPage code={404} icon={SearchX} title="Page not found" text="The page you're looking for doesn't exist or was moved." />
}
