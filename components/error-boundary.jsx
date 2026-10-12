"use client"

import { Component } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

function isNextRouterInternalError(error) {
  const digest = error?.digest || ''
  const msg = error?.message || ''
  return (
    digest.startsWith('NEXT_REDIRECT') ||
    digest.startsWith('NEXT_NOT_FOUND') ||
    msg === 'NEXT_REDIRECT' ||
    msg === 'NEXT_NOT_FOUND'
  )
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    // Never catch Next.js internal redirect() or notFound() signals
    if (isNextRouterInternalError(error)) {
      throw error
    }
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    if (isNextRouterInternalError(error)) {
      throw error
    }
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#080A0A] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#111615] border border-red-500/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <CardTitle className="text-2xl font-bold text-[#F4F1E8]">
                  Something went wrong
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-[#929B95]">
                An unexpected error occurred. Please try refreshing the page.
              </p>
              {this.state.error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-400 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              <Button
                onClick={() => window.location.reload()}
                className="w-full bg-[#B6F36B] text-[#080A0A] hover:bg-[#B6F36B]/90"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
