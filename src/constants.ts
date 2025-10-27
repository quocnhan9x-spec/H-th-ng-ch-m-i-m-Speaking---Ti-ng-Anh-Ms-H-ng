import type { Class, Assignment, Submission, Teacher } from './types';

export const MOCK_CLASSES: Class[] = [
  { id: 'c1', name: 'Tiếng Anh Giao Tiếp - Cấp 1' },
  { id: 'c2', name: 'Hội thoại Nâng cao' },
];

export const MOCK_ASSIGNMENTS: Assignment[] = [
  { 
    id: 'a1', 
    classId: 'c1', 
    date: '2024-07-20', 
    title: 'Giới thiệu sở thích của bạn', 
    dueDate: '2024-07-26', 
    sampleVideoUrls: ['https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'],
    sampleVideoTranscript: "[Video bắt đầu bằng cảnh một khu rừng hoạt hình. Nhạc nền vui nhộn nổi lên. Một nhân vật đang đuổi theo một con chim nhỏ để lấy quả mọng. Không có lời thoại nào trong suốt video, chỉ có hiệu ứng âm thanh và âm nhạc.]"
  },
  { id: 'a2', classId: 'c1', date: '2024-07-27', title: 'Mô tả kỳ nghỉ vừa qua của bạn', dueDate: '2024-08-02' },
  { id: 'a3', classId: 'c2', date: '2024-07-22', title: 'Tranh luận: Công nghệ trong giáo dục', dueDate: '2024-07-29' },
  { 
    id: 'a4', 
    classId: 'c2', 
    date: '2024-08-01', 
    title: 'Chủ đề tự chọn: Kể về một người bạn ngưỡng mộ', 
    dueDate: '2024-08-08',
    isFreestyle: true, // Đánh dấu đây là bài tập tự chọn
  },
];

export const MOCK_SUBMISSIONS: Submission[] = [
    {
        id: 's1',
        studentName: 'Alex Johnson',
        assignmentId: 'a1',
        classId: 'c1',
        submissionFileUrl: 'mock-audio-1.mp3',
        submissionFileName: 'alex_hobby.mp3',
        status: 'graded',
        score: 8.5,
        feedback: 'Làm tốt lắm, Alex! Em nói rõ ràng. Lần tới cố gắng dùng từ vựng đa dạng hơn nhé.',
        transcript: 'Hello, my name is Alex. My favorite hobby is... uh... playing guitar. I start play when I was 10. I like rock music. It is very fun.'
    },
    {
        id: 's2',
        studentName: 'Maria Garcia',
        assignmentId: 'a1',
        classId: 'c1',
        submissionFileUrl: 'mock-audio-2.mp3',
        submissionFileName: 'maria_cooking.mp3',
        status: 'graded',
        score: 6.0,
        feedback: 'Chào Maria, con nói khá tốt, nhưng chủ đề của con là về nấu ăn, không phải về sở thích như bài tập yêu cầu. Lần sau con chú ý đọc kỹ đề bài hơn nhé.',
        transcript: 'Today I want to talk about cooking. I like to make pasta. It is my favorite food. My mother taught me how to cook. It is a useful skill.',
        contentMismatched: true, // Đánh dấu nội dung không khớp
    },
    {
        id: 's3',
        studentName: 'Chen Wei',
        assignmentId: 'a3',
        classId: 'c2',
        submissionFileUrl: 'mock-video-1.mp4',
        submissionFileName: 'chen_debate.mp4',
        status: 'graded',
        score: 9.2,
        feedback: 'Lập luận xuất sắc và rất trôi chảy. Các luận điểm của em được cấu trúc tốt và có sức thuyết phục.',
        transcript: 'Good morning. In my opinion, technology is a double-edged sword in education. While it provides access to vast information, it can also be a significant distraction if not managed properly. We must focus on digital literacy.'
    }
];

export const MOCK_TEACHERS: Teacher[] = [
  { id: 't1', username: 'admin', password: '1' },
];
