'use client'

import TemplateForm from '../../create/TemplateForm'
import { useParams } from 'next/navigation'

export default function EditTemplatePage() {
  const params = useParams()
  const templateId = params.templateId as string
  
  return <TemplateForm templateId={templateId} />
}
