export interface Class {
  id: string;
  name: string;
}

export interface Assignment {
  id: string;
  classId: string;
  date: string; // YYYY-MM-DD
  title: string;
  dueDate: string; // YYYY-MM-DD
  sampleVideoUrls?: string[]; // Đường dẫn đến video mẫu của giáo viên
  sampleVideoTranscript?: string; // Bản ghi tổng hợp của (các) video mẫu
  isFreestyle?: boolean; // Cho phép chủ đề tự do, không cần so sánh với video mẫu
}

export interface Submission {
  id: string;
  studentName: string; 
  assignmentId: string;
  classId: string;
  submissionFileUrl: string;
  submissionFileName: string;
  transcript?: string;
  score?: number;
  feedback?: string;
  status: 'pending' | 'graded';
  contentMismatched?: boolean; // Cảnh báo nếu nội dung không khớp với video mẫu
}

export interface Teacher {
  id: string;
  username: string;
  password: string;
}