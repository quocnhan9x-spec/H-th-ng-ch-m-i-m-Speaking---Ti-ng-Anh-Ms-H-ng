import React, { createContext, useContext, useMemo, useState } from 'react'
import type { Class, Assignment, Submission, Teacher } from '../types'
import {
  MOCK_CLASSES,
  MOCK_ASSIGNMENTS,
  MOCK_SUBMISSIONS,
  MOCK_TEACHERS
} from '../constants'

type Role = 'student' | 'teacher' | null

type DataContextValue = {
  role: Role
  setRole: (r: Role) => void

  classes: Class[]
  assignments: Assignment[]
  submissions: Submission[]
  teachers: Teacher[]

  addSubmission: (s: Submission) => void
}

const DataContext = createContext<DataContextValue | undefined>(undefined)

export const DataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [role, setRole] = useState<Role>(null)

  // dữ liệu mock – có thể thay bằng fetch/Apps Script sau
  const [classes] = useState<Class[]>(MOCK_CLASSES)
  const [assignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS)
  const [submissions, setSubmissions] = useState<Submission[]>(MOCK_SUBMISSIONS)
  const [teachers] = useState<Teacher[]>(MOCK_TEACHERS)

  const addSubmission = (s: Submission) =>
    setSubmissions(prev => [s, ...prev])

  const value = useMemo<DataContextValue>(
    () => ({ role, setRole, classes, assignments, submissions, teachers, addSubmission }),
    [role, classes, assignments, submissions, teachers]
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within a DataProvider')
  return ctx
}
