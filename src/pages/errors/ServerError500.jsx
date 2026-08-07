import { ServerCrash } from 'lucide-react'
import ErrorPage from './ErrorPage'
export default function ServerError500() {
  return <ErrorPage code={500} icon={ServerCrash} title="Something went wrong" text="An unexpected server error occurred. Please try again shortly." />
}
