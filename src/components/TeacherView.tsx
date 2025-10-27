import React, { useState } from 'react'
import { useData } from '../contexts/DataContext'

export default function TeacherView() {
  const { submissions } = useData()
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-pink-700">Bài nộp gần đây</h2>

      {submissions.length === 0 && (
        <div className="text-slate-500">Chưa có bài nộp nào.</div>
      )}

      {submissions.map(s => (
        <details key={s.id} className="rounded-xl bg-white border p-4">
          <summary className="cursor-pointer flex items-center justify-between">
            <span>
              <b>Bài:</b> {s.assignmentId} — <b>HV:</b> {s.studentId}
            </span>
            <span className="text-sm text-slate-500">
              {new Date(s.createdAt).toLocaleString('vi-VN')}
            </span>
          </summary>

          <div className="pt-3 space-y-2">
            <a className="text-pink-700 underline" href={s.url} target="_blank">
              Mở bản ghi
            </a>

            <div className="flex gap-2 items-center">
              <button
                className={`px-3 py-1 rounded border ${selected === s.id ? 'bg-pink-600 text-white' : ''}`}
                onClick={() => setSelected(s.id)}
              >
                Chấm điểm (demo)
              </button>
              {s.score != null && (
                <span className="text-sm text-slate-600">Điểm: {s.score}</span>
              )}
            </div>
          </div>
        </details>
      ))}
    </section>
  )
}
