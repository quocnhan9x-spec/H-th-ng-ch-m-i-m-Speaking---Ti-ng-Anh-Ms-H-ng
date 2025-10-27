import React, { useState } from 'react'
import { useData } from '../contexts/DataContext'
import type { Submission } from '../types'

export default function StudentView() {
  const { assignments, addSubmission } = useData()
  const [recordUrl, setRecordUrl] = useState('')

  const submit = (assignmentId: string) => {
    if (!recordUrl) return
    const sub: Submission = {
      id: crypto.randomUUID(),
      assignmentId,
      studentId: 'student-001',
      url: recordUrl,
      score: null,
      teacherComment: null,
      createdAt: new Date().toISOString()
    }
    addSubmission(sub)
    setRecordUrl('')
    alert('Đã nộp bài!')
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-pink-700">Bài tập của bạn</h2>

      {assignments.map(a => (
        <div key={a.id} className="rounded-xl bg-white border p-4">
          <div className="font-medium">{a.title}</div>
          <div className="text-sm text-slate-500">
            Hạn nộp: {new Date(a.dueDate).toLocaleDateString('vi-VN')}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={recordUrl}
              onChange={e => setRecordUrl(e.target.value)}
              placeholder="Dán link bản ghi (Google Drive/YouTube...)"
              className="flex-1 px-3 py-2 rounded border"
            />
            <button
              onClick={() => submit(a.id)}
              className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700"
            >
              Nộp bài
            </button>
          </div>
        </div>
      ))}
    </section>
  )
}
