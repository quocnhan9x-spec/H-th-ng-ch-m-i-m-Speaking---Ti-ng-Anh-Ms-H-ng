import React from 'react'
import RoleSelection from './components/RoleSelection'
import StudentView from './components/StudentView'
import TeacherView from './components/TeacherView'
import { useData } from './contexts/DataContext'

export default function App() {
  const { role } = useData()

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 backdrop-blur bg-pink-100/70 border-b border-pink-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-semibold text-pink-700">
            Hệ thống chấm Điểm Speaking — Ms Hồng
          </h1>
          <a
            className="text-sm text-pink-700/80 hover:text-pink-800 underline"
            href="."
          >
            Làm mới
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4">
        {!role && <RoleSelection />}

        {role === 'student' && <StudentView />}
        {role === 'teacher' && <TeacherView />}
      </main>

      <footer className="py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} Ms Hồng — Demo trên GitHub Pages
      </footer>
    </div>
  )
}
