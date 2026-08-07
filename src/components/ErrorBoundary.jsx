import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('Skylark ERP crashed:', error, info) }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f8fc] p-6">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-card">
          <h1 className="text-xl font-bold text-ink">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-500">{this.state.error.message || 'An unexpected error occurred.'}</p>
          <button onClick={() => { this.setState({ error: null }); window.location.assign('/') }} className="btn-primary mt-6 w-full justify-center">
            Reload app
          </button>
        </div>
      </div>
    )
  }
}
