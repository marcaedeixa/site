import React from 'react'
import EditorPageClient from './EditorPageClient'

interface PageProps {
  params: Promise<{ projectId: string }>
}

export default function EditorPage({ params }: PageProps) {
  const { projectId } = React.use(params)

  return <EditorPageClient projectId={projectId} />
}
