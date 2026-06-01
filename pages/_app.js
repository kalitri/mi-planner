import '../styles/globals.css'
import { useRouter } from 'next/router'
import AuthGuard from '../components/AuthGuard'

const PUBLIC_ROUTES = ['/login']

export default function App({ Component, pageProps }) {
  const router = useRouter()

  if (PUBLIC_ROUTES.includes(router.pathname)) {
    return <Component {...pageProps} />
  }

  return (
    <AuthGuard>
      <Component {...pageProps} />
    </AuthGuard>
  )
}
