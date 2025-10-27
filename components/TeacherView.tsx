

// src/components/TeacherView.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import * as api from '../api';
import { Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { Spinner } from './shared/Spinner';
import type { Submission, Class, Assignment, Teacher } from '../types';
import { transcribeTeacherVideo } from '../services/geminiService';

type Tab = 'dashboard' | 'classes' | 'assignments' | 'submissions' | 'accounts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'dashboard', label: 'Thống kê' },
  { id: 'submissions', label: 'Bài nộp' },
  { id: 'assignments', label: 'Bài tập' },
  { id: 'classes', label: 'Lớp học' },
  { id: 'accounts', label: 'Tài khoản' },
];

const SUBMISSIONS_PER_PAGE = 15;

const COLOR_MAP: Record<string, string> = {
  'Yếu (0-4.9)': '#ef4444',
  'Trung bình (5.0-6.4)': '#f97316',
  'Khá (6.5-7.9)': '#eab308',
  'Giỏi (8.0-8.9)': '#22c55e',
  'Xuất sắc (9.0-10)': '#3b82f6',
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-xs">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

export const TeacherView: React.FC = () => {
  // ===== Context =====
  const { classes, assignments, submissions, teachers, fetchData } = useData();

  // ===== State chính =====
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');

  // Submissions
  const [gradingSubmission, setGradingSubmission] = useState<Submission | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<Submission | null>(null);

  // Classes
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [className, setClassName] = useState('');

  // Assignments
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    classId: '',
    date: '',
    dueDate: '',
    isFreestyle: false,
  });
  const [newAssignmentVideoFiles, setNewAssignmentVideoFiles] = useState<File[]>([]);
  const [newAssignmentTranscript, setNewAssignmentTranscript] = useState('');
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [expandedAssignmentId, setExpandedAssignmentId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Teachers
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [teacherFormState, setTeacherFormState] = useState({ username: '', password: '' });

  // Grading form
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Filters / search / pagination for submissions
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'graded'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'dueDate'>('newest');

  // Reset khi đổi tab
  useEffect(() => {
    setSearchQuery('');
    setCurrentPage(1);
    setFilterClassId('all');
    setFilterStatus('all');
    setSortBy('newest');
  }, [activeTab]);

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
  }, [classes, selectedClassId]);

  // Về trang 1 khi filter/query đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClassId, filterStatus, sortBy]);

  // Auto-transcribe khi upload video trong modal Assignment
  useEffect(() => {
    const run = async () => {
      if (newAssignmentVideoFiles.length > 0 && isAssignmentModalOpen) {
        setIsGeneratingTranscript(true);
        setNewAssignmentTranscript('');
        try {
          const arr = await Promise.all(
            newAssignmentVideoFiles.map((f) =>
              transcribeTeacherVideo(f).catch((e) => {
                console.error(`Lỗi tạo transcript cho ${f.name}:`, e);
                return `[Lỗi: Không thể tạo bản ghi cho file ${f.name}]`;
              })
            )
          );
          setNewAssignmentTranscript(arr.join('\n\n---\n\n'));
        } finally {
          setIsGeneratingTranscript(false);
        }
      } else if (isAssignmentModalOpen && !editingAssignment) {
        setNewAssignmentTranscript('');
      }
    };
    run();
  }, [newAssignmentVideoFiles, isAssignmentModalOpen, editingAssignment]);

  // ===== Derived data =====
  const filteredAssignments = useMemo(() => {
    if (!searchQuery) return assignments;
    const q = searchQuery.toLowerCase();
    return assignments
      .filter((a: Assignment) => a.title.toLowerCase().includes(q))
      .sort((a: Assignment, b: Assignment) => +new Date(b.date) - +new Date(a.date));
  }, [assignments, searchQuery]);

  const filteredAndSortedSubmissions = useMemo(() => {
    let list: Submission[] = [...submissions];

    if (filterClassId !== 'all') list = list.filter((s) => s.classId === filterClassId);
    if (filterStatus !== 'all') list = list.filter((s) => s.status === filterStatus);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => {
        const asg = assignments.find((a: Assignment) => a.id === s.assignmentId);
        return (
          s.studentName.toLowerCase().includes(q) ||
          s.submissionFileName.toLowerCase().includes(q) ||
          (asg && asg.title.toLowerCase().includes(q))
        );
      });
    }

    list.sort((a, b) => {
      const aAsg = assignments.find((x: Assignment) => x.id === a.assignmentId);
      const bAsg = assignments.find((x: Assignment) => x.id === b.assignmentId);
      if (!aAsg || !bAsg) return 0;

      switch (sortBy) {
        case 'dueDate':
          return +new Date(aAsg.dueDate) - +new Date(bAsg.dueDate);
        case 'oldest':
          return +new Date(aAsg.date) - +new Date(bAsg.date);
        case 'newest':
        default: {
          const sa = a.status === 'pending' ? 0 : 1;
          const sb = b.status === 'pending' ? 0 : 1;
          if (sa !== sb) return sa - sb;
          return +new Date(bAsg.date) - +new Date(aAsg.date);
        }
      }
    });

    return list;
  }, [submissions, assignments, searchQuery, filterClassId, filterStatus, sortBy]);

  // Giữ currentPage hợp lệ
  useEffect(() => {
    const total = Math.ceil(filteredAndSortedSubmissions.length / SUBMISSIONS_PER_PAGE);
    if (currentPage > total && total > 0) setCurrentPage(total);
  }, [filteredAndSortedSubmissions, currentPage]);

  const dashboardStats = useMemo(() => {
    const classSubs = submissions.filter((s: Submission) => s.classId === selectedClassId);
    const graded = classSubs.filter((s) => s.status === 'graded' && typeof s.score === 'number');
    const total = classSubs.length;
    const numGraded = graded.length;
    const numPending = total - numGraded;
    const averageScore = numGraded > 0 ? graded.reduce((sum, s) => sum + (s.score || 0), 0) / numGraded : 0;

    const scoreRanges: Record<string, number> = {
      'Yếu (0-4.9)': 0,
      'Trung bình (5.0-6.4)': 0,
      'Khá (6.5-7.9)': 0,
      'Giỏi (8.0-8.9)': 0,
      'Xuất sắc (9.0-10)': 0,
    };
    graded.forEach((s) => {
      const val = s.score || 0;
      if (val <= 4.9) scoreRanges['Yếu (0-4.9)']++;
      else if (val <= 6.4) scoreRanges['Trung bình (5.0-6.4)']++;
      else if (val <= 7.9) scoreRanges['Khá (6.5-7.9)']++;
      else if (val <= 8.9) scoreRanges['Giỏi (8.0-8.9)']++;
      else scoreRanges['Xuất sắc (9.0-10)']++;
    });

    const chartData =
      numGraded === 0
        ? []
        : Object.entries(scoreRanges)
            .map(([name, value]) => ({ name, value, color: COLOR_MAP[name] }))
            .filter((it) => it.value > 0);

    return { totalSubmissions: total, numGraded, numPending, averageScore, chartData, hasGradedSubmissions: numGraded > 0 };
  }, [submissions, selectedClassId]);

  // ===== Handlers =====
  const handleSaveGrade = async () => {
    if (!gradingSubmission) return;
    try {
        await api.scoreUpdate({ submissionId: gradingSubmission.id, score, feedback, status: 'graded' });
        await fetchData();
        setGradingSubmission(null);
        setScore(0);
        setFeedback('');
    } catch(e) {
        console.error("Error saving grade:", e);
        alert("Lỗi khi lưu điểm. Vui lòng thử lại.");
    }
  };

  const handleDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    try {
        await api.submitDelete({ id: submissionToDelete.id });
        await fetchData();
        setSubmissionToDelete(null);
    } catch (e) {
        console.error("Error deleting submission:", e);
        alert("Lỗi khi xoá bài nộp. Vui lòng thử lại.");
    }
  };

  const closeAndResetClassModal = () => {
    setIsClassModalOpen(false);
    setClassName('');
    setEditingClass(null);
  };

  const openAddClassModal = () => {
    setEditingClass(null);
    setClassName('');
    setIsClassModalOpen(true);
  };

  const openEditClassModal = (c: Class) => {
    setEditingClass(c);
    setClassName(c.name);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    try {
        if (editingClass) {
          await api.classUpdate({ id: editingClass.id, name: className.trim() });
        } else {
          await api.classCreate({ name: className.trim() });
        }
        await fetchData();
        closeAndResetClassModal();
    } catch (e) {
        console.error("Error saving class:", e);
        alert("Lỗi khi lưu lớp học. Vui lòng thử lại.");
    }
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    const id = classToDelete.id;
    try {
        await api.classDelete({ id });
        await fetchData();
        if (selectedClassId === id) {
          setSelectedClassId(classes.find(c => c.id !== id)?.id || '');
        }
        setClassToDelete(null);
    } catch (e) {
        console.error("Error deleting class:", e);
        alert("Lỗi khi xoá lớp học. Vui lòng thử lại.");
    }
  };

  const openEditAssignmentModal = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setNewAssignment({
      title: assignment.title,
      classId: assignment.classId,
      date: assignment.date,
      dueDate: assignment.dueDate,
      isFreestyle: !!assignment.isFreestyle,
    });
    setNewAssignmentTranscript(assignment.sampleVideoTranscript || '');
    setNewAssignmentVideoFiles([]);
    setIsAssignmentModalOpen(true);
  };

  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;
    try {
        await api.assignDelete({ id: assignmentToDelete.id });
        await fetchData();
        setAssignmentToDelete(null);
    } catch (e) {
        console.error("Error deleting assignment", e);
        alert("Lỗi khi xoá bài tập. Vui lòng thử lại.");
    }
  };

  const closeAndResetAssignmentModal = () => {
    setIsAssignmentModalOpen(false);
    setEditingAssignment(null);
    setNewAssignment({ title: '', classId: '', date: '', dueDate: '', isFreestyle: false });
    setNewAssignmentVideoFiles([]);
    setNewAssignmentTranscript('');
    setIsGeneratingTranscript(false);
    setIsCreatingAssignment(false);
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    const { title, classId, date, dueDate } = newAssignment;
    if (!title.trim() || !classId || !date || !dueDate) {
      alert('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setIsCreatingAssignment(true);
    try {
      // Convert files to base64
      const filesPayload = await Promise.all(
          newAssignmentVideoFiles.map(async (file) => ({
              data: await fileToBase64(file),
              name: file.name,
              type: file.type,
          }))
      );
        
      const data: any = {
        ...newAssignment,
        title: title.trim(),
        sampleVideoTranscript: newAssignmentTranscript.trim() || undefined,
        files: filesPayload, // Add files to the payload
      };

      if (editingAssignment) {
        await api.assignUpdate({ ...data, id: editingAssignment.id });
      } else {
        await api.assignCreate(data);
      }
      
      await fetchData();
      closeAndResetAssignmentModal();
    } catch (err) {
      console.error('Không thể tạo/sửa bài tập:', err);
      alert('Đã xảy ra lỗi khi tạo/sửa bài tập. Vui lòng thử lại.');
    } finally {
      setIsCreatingAssignment(false);
    }
  };

  const handleVideoFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setNewAssignmentVideoFiles(Array.from(e.target.files));
  };

  // Teacher CRUD
  const openAddTeacherModal = () => {
    setEditingTeacher(null);
    setTeacherFormState({ username: '', password: '' });
    setIsTeacherModalOpen(true);
  };

  const openEditTeacherModal = (t: Teacher) => {
    setEditingTeacher(t);
    setTeacherFormState({ username: t.username, password: t.password });
    setIsTeacherModalOpen(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const { username, password } = teacherFormState;
    if (!username.trim() || !password.trim()) {
      alert('Tên đăng nhập và mật khẩu không được để trống.');
      return;
    }
    try {
        await api.teacherUpsert({ ...teacherFormState, id: editingTeacher?.id });
        await fetchData();
        setIsTeacherModalOpen(false);
    } catch (e) {
        console.error("Error saving teacher:", e);
        alert("Lỗi khi lưu tài khoản. Vui lòng thử lại.");
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
        await api.teacherDelete({ username: teacherToDelete.username });
        await fetchData();
        setTeacherToDelete(null);
    } catch(e) {
        console.error("Error deleting teacher:", e);
        alert("Lỗi khi xoá tài khoản. Vui lòng thử lại.");
    }
  };

  // ===== Render từng tab =====
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': {
        if (classes.length === 0) {
          return (
            <Card>
              <div className="text-center p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-2">Chào mừng đến với Bảng điều khiển!</h3>
                <p className="text-slate-500 mb-4">Để bắt đầu, bạn cần tạo lớp học đầu tiên.</p>
                <Button onClick={() => setActiveTab('classes')}>
                  Đi đến Quản lý Lớp học
                </Button>
              </div>
            </Card>
          );
        }
        const { totalSubmissions, numGraded, numPending, averageScore, chartData, hasGradedSubmissions } = dashboardStats;
        return (
          <div className="space-y-6">
            <Card>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                <h3 className="text-xl font-bold text-slate-800">Tổng quan lớp học</h3>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="mt-2 sm:mt-0 w-full sm:w-auto md:w-1/3 pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                >
                  {classes.map((c: Class) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-pink-100 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-pink-800">Tổng số bài nộp</h4>
                  <p className="text-3xl font-bold text-pink-600 mt-1">{totalSubmissions}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-green-800">Đã chấm</h4>
                  <p className="text-3xl font-bold text-green-600 mt-1">{numGraded}</p>
                </div>
                <div className="bg-yellow-100 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-yellow-800">Chờ chấm</h4>
                  <p className="text-3xl font-bold text-yellow-600 mt-1">{numPending}</p>
                </div>
                <div className="bg-blue-100 p-4 rounded-lg shadow-sm">
                  <h4 className="text-sm font-medium text-blue-800">Điểm trung bình</h4>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{averageScore.toFixed(2)}</p>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-4 pt-4 border-t border-slate-200">Phân bổ điểm số</h3>
              {hasGradedSubmissions ? (
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} học sinh`, name]} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: '20px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
                  <p className="text-slate-500">Chưa có bài nộp nào được chấm điểm cho lớp này.</p>
                </div>
              )}
            </Card>
          </div>
        );
      }

      case 'submissions': {
        const totalPages = Math.ceil(filteredAndSortedSubmissions.length / SUBMISSIONS_PER_PAGE);
        const paginated = filteredAndSortedSubmissions.slice(
          (currentPage - 1) * SUBMISSIONS_PER_PAGE,
          currentPage * SUBMISSIONS_PER_PAGE
        );

        const handlePageChange = (p: number) => {
          if (p >= 1 && p <= totalPages) setCurrentPage(p);
        };

        return (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <h3 className="text-2xl font-bold text-slate-800">Các bài nộp của học sinh</h3>
              <div className="w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Tìm theo tên học sinh, bài tập..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                />
              </div>
            </div>

            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="filter-class" className="block text-xs font-medium text-slate-500 mb-1">
                    Lớp học
                  </label>
                  <select
                    id="filter-class"
                    value={filterClassId}
                    onChange={(e) => setFilterClassId(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    <option value="all">Tất cả lớp học</option>
                    {classes.map((c: Class) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="filter-status" className="block text-xs font-medium text-slate-500 mb-1">
                    Trạng thái
                  </label>
                  <select
                    id="filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as any)}
                    className="w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    <option value="all">Tất cả</option>
                    <option value="pending">Chờ chấm</option>
                    <option value="graded">Đã chấm</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="sort-by" className="block text-xs font-medium text-slate-500 mb-1">
                    Sắp xếp theo
                  </label>
                  <select
                    id="sort-by"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="dueDate">Gần hạn nộp</option>
                  </select>
                </div>
              </div>
            </Card>

            {filteredAndSortedSubmissions.length === 0 ? (
              <Card>
                <div className="text-center p-8">
                  <h3 className="text-lg font-semibold text-slate-700">Chưa có bài nộp nào</h3>
                  {assignments.length === 0 ? (
                    <>
                      <p className="text-slate-500 mt-2 mb-4">Bạn chưa giao bài tập nào. Hãy tạo bài tập để học sinh có thể nộp bài.</p>
                      <Button onClick={() => setActiveTab('assignments')}>Tạo bài tập mới</Button>
                    </>
                  ) : (
                    <p className="text-slate-500 mt-2">Chưa có học sinh nào nộp bài, hoặc không có bài nộp nào khớp với bộ lọc của bạn.</p>
                  )}
                </div>
              </Card>
            ) : paginated.length === 0 ? (
                 <Card>
                    <p className="text-slate-500 text-center p-8">Không tìm thấy bài nộp nào trên trang này. Hãy thử trang khác hoặc thay đổi bộ lọc.</p>
                </Card>
            ) : (
              paginated.map((sub) => {
                const asg = assignments.find((a: Assignment) => a.id === sub.assignmentId);
                const cls = classes.find((c: Class) => c.id === sub.classId);
                const isExpanded = expandedSubmissionId === sub.id;
                if (!asg || !cls) return null;

                return (
                  <Card key={sub.id} className="p-0 overflow-visible">
                    <div className="p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-pink-600">{cls.name}</p>
                            <p className="text-xs text-slate-500">Hạn nộp: {new Date(asg.dueDate).toLocaleDateString('vi-VN')}</p>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-lg font-bold text-slate-900">{sub.studentName}</span>
                            {sub.contentMismatched && (
                              <span title="Nội dung bài nộp không khớp với chủ đề">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                                  <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{asg.title}</p>
                        </div>

                        <div className="flex-shrink-0 flex sm:flex-col items-end justify-between w-full sm:w-auto">
                          <span
                            className={`inline-flex items-center px-3 py-1 text-xs leading-5 font-semibold rounded-full ${
                              sub.status === 'graded' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {sub.status === 'graded' ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 -ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {sub.status === 'graded' ? `Đã chấm: ${sub.score?.toFixed(1)}/10` : 'Chờ chấm'}
                          </span>

                          <div className="flex items-center justify-end space-x-2 mt-0 sm:mt-4">
                            <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setGradingSubmission(sub); setScore(sub.score || 0); setFeedback(sub.feedback || ''); }}>
                              {sub.status === 'graded' ? 'Sửa' : 'Chấm'}
                            </Button>
                            <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setSubmissionToDelete(sub); }}>
                              Xóa
                            </Button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                        className="w-full flex items-center justify-center text-sm text-slate-500 hover:text-pink-600 mt-4 pt-2 border-t border-slate-200"
                      >
                        <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${isExpanded ? 'max-h-[1000px]' : ''}`}>
                      <div className="bg-slate-50/75 p-6 border-t border-slate-200 space-y-4">
                        {sub.contentMismatched && (
                          <div className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-md">
                            <p className="font-semibold">Lưu ý: Nội dung bài nộp của học sinh có thể không khớp với chủ đề của video mẫu.</p>
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-sm text-slate-800">Transcript (AI-Generated):</h4>
                          <blockquote className="mt-1 text-sm text-slate-700 bg-white p-3 rounded-md border-l-4 border-slate-300 italic">"{sub.transcript}"</blockquote>
                        </div>
                        {sub.feedback && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-800 flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span>Nhận xét:</span>
                            </h4>
                            <div className="mt-1 text-sm text-slate-700 bg-white p-4 rounded-lg whitespace-pre-wrap leading-relaxed border border-slate-200">
                              {sub.feedback}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-1 mt-6 py-2">
                <Button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} variant="secondary" size="sm" className="px-2.5">
                  &laquo;
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors duration-200 ${
                      currentPage === p ? 'bg-pink-600 text-white font-semibold shadow' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <Button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  size="sm"
                  className="px-2.5"
                >
                  &raquo;
                </Button>
              </div>
            )}
          </div>
        );
      }

      case 'assignments':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold text-slate-800">Quản lý bài tập</h3>
              <Button onClick={() => setIsAssignmentModalOpen(true)} disabled={classes.length === 0}>Giao Bài tập Mới</Button>
            </div>
            <div className="w-full md:w-1/2">
              <input
                type="text"
                placeholder="Tìm kiếm bài tập theo tiêu đề..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
              />
            </div>

            {filteredAssignments.length === 0 ? (
                <Card>
                  {searchQuery ? (
                    <p className="text-slate-500 text-center p-8">Không tìm thấy bài tập nào khớp với tìm kiếm.</p>
                  ) : (
                    <div className="text-center p-8">
                      <h3 className="text-lg font-semibold text-slate-700">Chưa có bài tập nào</h3>
                      {classes.length === 0 ? (
                        <>
                          <p className="text-slate-500 mt-2 mb-4">Bạn cần tạo lớp học trước khi có thể giao bài tập.</p>
                          <Button onClick={() => setActiveTab('classes')}>Tạo lớp học</Button>
                        </>
                      ) : (
                        <>
                          <p className="text-slate-500 mt-2 mb-4">Hãy bắt đầu bằng cách giao bài tập đầu tiên cho học sinh của bạn.</p>
                          <Button onClick={() => setIsAssignmentModalOpen(true)}>Giao Bài tập Mới</Button>
                        </>
                      )}
                    </div>
                  )}
                </Card>
              ) : (
              filteredAssignments.map((asg: Assignment) => {
                const isExpanded = expandedAssignmentId === asg.id;
                const isOverdue = new Date() > new Date(asg.dueDate);
                return (
                  <Card key={asg.id} className="p-0 overflow-visible">
                    <div className="p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-x-2">
                            <span className="text-lg font-bold text-slate-900">{asg.title}</span>
                            {asg.isFreestyle && (
                              <span title="Chủ đề tự chọn" className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full text-xs font-semibold">
                                Tự chọn
                              </span>
                            )}
                            {asg.sampleVideoUrls?.length ? (
                              <span title="Có video mẫu" className="ml-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </span>
                            ) : null}
                            {isOverdue && (
                              <span title="Đã quá hạn nộp" className="text-red-500 bg-red-100 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v2a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                                </svg>
                                Quá hạn
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-pink-600 font-semibold mt-1">{classes.find((c: Class) => c.id === asg.classId)?.name || 'N/A'}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <p className="text-sm text-slate-600">Ngày giao: {asg.date}</p>
                          <p className="text-sm text-slate-600 font-medium">Hạn nộp: {asg.dueDate}</p>
                          <div className="flex items-center justify-end space-x-2 mt-2">
                            <Button size="sm" variant="secondary" onClick={() => openEditAssignmentModal(asg)}>
                              Sửa
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setAssignmentToDelete(asg)}>
                              Xóa
                            </Button>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedAssignmentId(isExpanded ? null : asg.id)}
                        className="w-full flex items-center justify-center text-sm text-slate-500 hover:text-pink-600 mt-4 pt-2 border-t border-slate-200"
                      >
                        <span>{isExpanded ? 'Thu gọn' : 'Xem chi tiết'}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${isExpanded ? 'max-h-[1000px]' : ''}`}>
                      <div className="bg-slate-50/75 p-6 border-t border-slate-200 space-y-4">
                        {asg.sampleVideoTranscript && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-800">Bản ghi video mẫu:</h4>
                            <blockquote className="mt-2 text-sm text-slate-700 bg-white p-3 rounded-md border-l-4 border-pink-300 italic whitespace-pre-wrap">
                              "{asg.sampleVideoTranscript}"
                            </blockquote>
                          </div>
                        )}
                        {!!asg.sampleVideoUrls?.length && (
                          <div>
                            <h4 className="font-semibold text-sm text-slate-800 mb-2">Video mẫu:</h4>
                            <div className="flex flex-wrap gap-2">
                              {asg.sampleVideoUrls.map((url, idx) => (
                                <Button
                                  key={idx}
                                  size="sm"
                                  variant="secondary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 -ml-1 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Xem Video {asg.sampleVideoUrls.length > 1 ? idx + 1 : ''}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                        {!asg.sampleVideoTranscript && !asg.sampleVideoUrls?.length && (
                          <p className="text-sm text-slate-500 italic">Không có video mẫu hoặc bản ghi cho bài tập này.</p>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        );

      case 'classes':
        return (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Quản lý lớp học</h3>
              <Button onClick={openAddClassModal}>Thêm Lớp học Mới</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tên Lớp</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                        Chưa có lớp học nào. <br/> Bấm "Thêm Lớp học Mới" để bắt đầu.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c: Class) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{c.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditClassModal(c)}>
                          Sửa
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setClassToDelete(c)}>
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Card>
        );

      case 'accounts':
        return (
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Quản lý Tài khoản Giáo viên</h3>
              <Button onClick={openAddTeacherModal}>Thêm tài khoản</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tên đăng nhập</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {teachers.length === 0 ? (
                     <tr>
                      <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                        Không có tài khoản giáo viên nào khác.
                      </td>
                    </tr>
                  ) : (
                  teachers.map((t: Teacher) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{t.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <Button variant="secondary" size="sm" onClick={() => openEditTeacherModal(t)}>
                          Sửa
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setTeacherToDelete(t)}>
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  )))}
                </tbody>
              </table>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

  // ===== JSX chính =====
  return (
    <div>
      <div className="mb-6 border-b border-slate-300">
        <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id ? 'border-pink-500 text-pink-600 bg-pink-100' : 'border-transparent text-slate-500 hover:text-pink-700 hover:bg-pink-50'
              } whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm rounded-t-lg transition-colors duration-200`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>{renderContent()}</div>

      {/* Modal chấm điểm */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Chấm điểm bài nộp</h3>
            <div className="space-y-4">
              {gradingSubmission.contentMismatched && (
                <div className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-md">
                  <p className="font-semibold">Lưu ý: Nội dung bài nộp có thể không khớp với chủ đề của video mẫu.</p>
                </div>
              )}
              <p><span className="font-semibold">Học sinh:</span> {gradingSubmission.studentName}</p>
              <p><span className="font-semibold">Bài tập:</span> {assignments.find((a: Assignment) => a.id === gradingSubmission.assignmentId)?.title}</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bài nộp của Học sinh: <span className="font-normal text-slate-500">{gradingSubmission.submissionFileName}</span></label>
                <div className="bg-slate-100 p-2 rounded-md">
                  {(() => {
                    const url = gradingSubmission.submissionFileUrl.toLowerCase();
                    const isVideo = ['.mp4', '.mov', '.webm', '.ogv', '.mkv', '.avi'].some(ext => url.endsWith(ext));
                    
                    if (isVideo) {
                      return (
                        <video controls src={gradingSubmission.submissionFileUrl} className="w-full rounded aspect-video bg-black">
                          Trình duyệt của bạn không hỗ trợ thẻ video.
                        </video>
                      );
                    } else {
                      return (
                        <audio controls src={gradingSubmission.submissionFileUrl} className="w-full">
                          Trình duyệt của bạn không hỗ trợ thẻ audio.
                        </audio>
                      );
                    }
                  })()}
                </div>
              </div>

              {(() => {
                const assignment = assignments.find((a: Assignment) => a.id === gradingSubmission.assignmentId);
                const isFreestyle = assignment?.isFreestyle;
                return (
                  <div className={`grid grid-cols-1 ${!isFreestyle ? 'md:grid-cols-2' : ''} gap-4`}>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transcript của Học sinh (AI-Generated)</label>
                      <div className="text-sm text-slate-800 bg-slate-100 p-3 rounded-md h-full min-h-[120px] overflow-y-auto">
                        <p className="italic leading-relaxed">"{gradingSubmission.transcript}"</p>
                      </div>
                    </div>
                    {!isFreestyle && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bản ghi Mẫu (Giáo viên)</label>
                        {assignment?.sampleVideoTranscript ? (
                          <div className="text-sm text-slate-800 bg-pink-100 p-3 rounded-md h-full min-h-[120px] overflow-y-auto space-y-2">
                            <p className="italic leading-relaxed whitespace-pre-wrap">"{assignment.sampleVideoTranscript}"</p>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 bg-slate-100 p-3 rounded-md h-full min-h-[120px] flex items-center justify-center">
                            <p className="italic">Không có bản ghi mẫu.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div>
                <label htmlFor="score" className="block text-sm font-medium text-slate-700">Điểm (0-10)</label>
                <input
                  type="number"
                  id="score"
                  step="0.1"
                  min="0"
                  max="10"
                  value={score}
                  onChange={(e) => setScore(parseFloat(e.target.value))}
                  className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="feedback" className="block text-sm font-medium text-slate-700">Nhận xét</label>
                <textarea
                  id="feedback"
                  rows={4}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setGradingSubmission(null)}>Hủy</Button>
              <Button onClick={handleSaveGrade}>Lưu điểm</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirm delete modals */}
      {submissionToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận Xóa</h3>
            <p className="text-slate-600 mb-6">
              Xóa bài nộp của <span className="font-semibold">{submissionToDelete.studentName}</span> cho bài
              <span className="font-semibold"> "{assignments.find((a: Assignment) => a.id === submissionToDelete.assignmentId)?.title}"</span>? Hành động không thể hoàn tác.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setSubmissionToDelete(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeleteSubmission}>Xác nhận Xóa</Button>
            </div>
          </Card>
        </div>
      )}

      {classToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận Xóa Lớp học</h3>
            <p className="text-slate-600 mb-6">
              Xóa lớp <span className="font-semibold">"{classToDelete.name}"</span>? Các bài tập và bài nộp liên quan cũng sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setClassToDelete(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeleteClass}>Xác nhận Xóa</Button>
            </div>
          </Card>
        </div>
      )}

      {assignmentToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận Xóa Bài tập</h3>
            <p className="text-slate-600 mb-6">
              Xóa bài tập <span className="font-semibold">"{assignmentToDelete.title}"</span>? Tất cả bài nộp liên quan sẽ bị xóa vĩnh viễn.
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setAssignmentToDelete(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeleteAssignment}>Xác nhận Xóa</Button>
            </div>
          </Card>
        </div>
      )}

      {teacherToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Xác nhận Xóa Tài khoản</h3>
            <p className="text-slate-600 mb-6">
              Xóa tài khoản giáo viên <span className="font-semibold">"{teacherToDelete.username}"</span>?
            </p>
            <div className="flex justify-end space-x-3">
              <Button variant="secondary" onClick={() => setTeacherToDelete(null)}>Hủy</Button>
              <Button variant="danger" onClick={handleDeleteTeacher}>Xác nhận Xóa</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal Class */}
      {isClassModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <form onSubmit={handleSaveClass}>
              <h3 className="text-xl font-bold mb-4">{editingClass ? 'Sửa Tên Lớp học' : 'Tạo Lớp học Mới'}</h3>
              <div>
                <label htmlFor="className" className="block text-sm font-medium text-slate-700">Tên lớp học</label>
                <input
                  type="text"
                  id="className"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                  required
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={closeAndResetClassModal}>Hủy</Button>
                <Button type="submit">{editingClass ? 'Lưu thay đổi' : 'Tạo Lớp'}</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Assignment */}
      {isAssignmentModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveAssignment}>
              <h3 className="text-xl font-bold mb-4">{editingAssignment ? 'Sửa Bài tập' : 'Giao Bài tập Mới'}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="assignmentTitle" className="block text-sm font-medium text-slate-700">Tiêu đề bài tập</label>
                  <input
                    type="text"
                    id="assignmentTitle"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    required
                    placeholder="Hãy nhập tên tiêu đề bài tập"
                  />
                </div>

                <div className="relative flex items-start">
                  <div className="flex h-6 items-center">
                    <input
                      id="isFreestyle"
                      name="isFreestyle"
                      type="checkbox"
                      checked={newAssignment.isFreestyle}
                      onChange={(e) => setNewAssignment({ ...newAssignment, isFreestyle: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-pink-600 focus:ring-pink-600"
                    />
                  </div>
                  <div className="ml-3 text-sm leading-6">
                    <label htmlFor="isFreestyle" className="font-medium text-slate-900">Chủ đề tự chọn</label>
                    <p className="text-slate-500">Cho phép học sinh tự do nói về chủ đề được giao.</p>
                  </div>
                </div>

                {newAssignment.isFreestyle && (
                  <div className="p-3 bg-blue-100 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-md">
                    <p><strong>Lưu ý:</strong> Với chủ đề tự chọn, chấm điểm tập trung vào phát âm & độ trôi chảy, không so sánh với video mẫu.</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700">Tải lên video mẫu {newAssignment.isFreestyle ? '(tùy chọn)' : ''}</label>

                  {editingAssignment?.sampleVideoUrls?.length && newAssignmentVideoFiles.length === 0 ? (
                    <p className="text-xs text-slate-500 mt-1">
                      Bài tập này đã có {editingAssignment.sampleVideoUrls.length} video mẫu. Tải lên file mới sẽ thay thế các video hiện có.
                    </p>
                  ) : null}

                  {newAssignmentVideoFiles.length === 0 ? (
                    <div className="mt-1">
                      <label
                        htmlFor="video-upload"
                        className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-slate-300 bg-white px-6 pt-5 pb-6 text-center transition-colors hover:border-pink-400"
                      >
                        <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.158 0a.225.225 0 01.225-.225h.01a.225.225 0 01.225.225v.01a.225.225 0 01-.225.225h-.01a.225.225 0 01-.225-.225v-.01z" />
                        </svg>
                        <span className="mt-2 block text-sm font-semibold text-pink-600">Bấm để tải lên video</span>
                        <span className="block text-xs text-slate-500">hoặc kéo và thả</span>
                        <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleVideoFilesChange} accept="video/*" multiple />
                      </label>
                    </div>
                  ) : (
                    <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-4">
                      <p className="text-sm font-medium text-slate-800">File đã chọn:</p>
                      <ul className="mt-2 space-y-2">
                        {newAssignmentVideoFiles.map((file, index) => (
                          <li key={index} className="flex items-center justify-between text-sm text-slate-700">
                            <div className="flex items-center space-x-2 truncate">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate">{file.name}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-3 text-right">
                        <label htmlFor="video-upload" className="cursor-pointer rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                          Thay đổi
                          <input id="video-upload" name="video-upload" type="file" className="sr-only" onChange={handleVideoFilesChange} accept="video/*" multiple />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {(newAssignmentTranscript || isGeneratingTranscript) && (
                  <div className="space-y-3 mt-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <label htmlFor="transcript-combined" className="block text-sm font-medium text-slate-700 truncate pr-2">
                          Bản ghi video mẫu (tổng hợp)
                        </label>
                        {isGeneratingTranscript && <Spinner size="sm" />}
                      </div>
                      <textarea
                        id="transcript-combined"
                        rows={5}
                        value={newAssignmentTranscript}
                        onChange={(e) => setNewAssignmentTranscript(e.target.value)}
                        className="mt-2 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm disabled:bg-slate-200"
                        placeholder={isGeneratingTranscript ? 'AI đang lắng nghe và tổng hợp bản ghi...' : 'Bản ghi tổng hợp sẽ xuất hiện ở đây hoặc chỉnh sửa bản ghi hiện có.'}
                        disabled={isGeneratingTranscript}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500"><strong>Lưu ý:</strong> Bản ghi được tạo tự động bởi AI. Hãy rà soát và chỉnh sửa cho chính xác.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="assignmentClass" className="block text-sm font-medium text-slate-700">Chọn lớp</label>
                    <select
                      id="assignmentClass"
                      value={newAssignment.classId}
                      onChange={(e) => setNewAssignment({ ...newAssignment, classId: e.target.value })}
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
                      required
                    >
                      <option value="">-- Chọn một lớp --</option>
                      {classes.map((c: Class) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label htmlFor="assignmentDate" className="block text-sm font-medium text-slate-700">Ngày giao</label>
                      <input
                        type="date"
                        id="assignmentDate"
                        value={newAssignment.date}
                        onChange={(e) => setNewAssignment({ ...newAssignment, date: e.target.value })}
                        className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">Hạn làm bài</label>
                      <input
                        type="date"
                        id="dueDate"
                        value={newAssignment.dueDate}
                        onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                        className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={closeAndResetAssignmentModal}>Hủy</Button>
                <Button type="submit" disabled={isCreatingAssignment || isGeneratingTranscript}>
                  {isCreatingAssignment && <Spinner size="sm" />}
                  <span>{isCreatingAssignment ? (editingAssignment ? 'Đang lưu...' : 'Đang tạo...') : editingAssignment ? 'Lưu thay đổi' : 'Giao Bài'}</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Teacher */}
      {isTeacherModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <form onSubmit={handleSaveTeacher}>
              <h3 className="text-xl font-bold mb-4">{editingTeacher ? 'Sửa Tài khoản' : 'Thêm Tài khoản Mới'}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="teacherUsername" className="block text-sm font-medium text-slate-700">Tên đăng nhập</label>
                  <input
                    type="text"
                    id="teacherUsername"
                    value={teacherFormState.username}
                    onChange={(e) => setTeacherFormState({ ...teacherFormState, username: e.target.value })}
                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="teacherPassword" className="block text-sm font-medium text-slate-700">Mật khẩu</label>
                  <input
                    type="password"
                    id="teacherPassword"
                    value={teacherFormState.password}
                    onChange={(e) => setTeacherFormState({ ...teacherFormState, password: e.target.value })}
                    className="mt-1 block w-full border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button type="button" variant="secondary" onClick={() => setIsTeacherModalOpen(false)}>Hủy</Button>
                <Button type="submit">Lưu</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

// Default export might be needed if other files use it, keeping for compatibility.
// export default TeacherView;