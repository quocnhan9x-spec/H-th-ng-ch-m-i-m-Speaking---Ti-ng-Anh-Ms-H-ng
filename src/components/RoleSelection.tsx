import React from 'react'
import { useData } from '../contexts/DataContext'

export default function RoleSelection() {
  const { setRole } = useData()
  return (
    <section className="rounded-2xl bg-white/80 border border-pink-200 p-6 shadow-sm">
      <h2 className="text-lg font-semibold mb-4 text-pink-700">
        Chọn vai trò để bắt đầu
      </h2>
      <div className="flex gap-3">
        <button
          className="px-4 py-2 rounded-xl bg-pink-600 text-white hover:bg-pink-700"
          onClick={() => setRole('student')}
        >
          Học viên
        </button>
        <button
          className="px-4 py-2 rounded-xl bg-slate-800 text-white hover:bg-slate-900"
          onClick={() => setRole('teacher')}
        >
          Giáo viên
        </button>
      </div>
    </section>
  )
}
