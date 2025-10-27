import type { Class, Assignment, Submission, Teacher } from './types'

export const MOCK_CLASSES: Class[] = [
  { id: 'c1', name: 'Tiếng Anh Giao Tiếp - Cấp 1' },
  { id: 'c2', name: 'Hội thoại Nâng cao' }
]

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { id: 'a1', classId: 'c1', title: 'Giới thiệu sở thích của bạn', dueDate: '2024-07-26' },
  { id: 'a2', classId: 'c2', title: 'Nói về kế hoạch cuối tuần', dueDate: '2024-08-10' }
]

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 's1',
    assignmentId: 'a1',
    studentId: 'student-001',
    url: 'https://example.com/your-record.mp4',
    score: 8.5,
    teacherComment: 'Phát âm tốt, cần chậm rãi hơn.',
    createdAt: '2024-07-21T09:00:00.000Z'
  }
]

export const MOCK_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Ms Hồng' }
]
