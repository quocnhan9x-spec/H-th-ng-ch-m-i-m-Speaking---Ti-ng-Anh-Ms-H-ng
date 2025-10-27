export type Class = { id: string; name: string }

export type Assignment = {
  id: string
  classId: string
  title: string
  dueDate: string
}

export type Submission = {
  id: string
  assignmentId: string
  studentId: string
  url: string
  score: number | null
  teacherComment: string | null
  createdAt: string
}

export type Teacher = { id: string; name: string }
