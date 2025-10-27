
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../contexts/DataContext';
import * as api from '../api';
import { Card } from './shared/Card';
import { Button } from './shared/Button';
import { generateTranscript, checkContentSimilarity, generateGradeAndFeedback } from '../services/geminiService';
import type { Submission, Assignment } from '../types';
import { Spinner } from './shared/Spinner';

const StudentView: React.FC = () => {
  const { classes, assignments, submissions, fetchData, loading } = useData();
  
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [studentName, setStudentName] = useState(''); // cho HS nhập tên
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((a: Assignment) => a.classId === selectedClassId);
  }, [assignments, selectedClassId]);

  const selectedAssignment = useMemo(() => {
    return assignments.find((a: Assignment) => a.id === selectedAssignmentId);
  }, [assignments, selectedAssignmentId]);

  const isOverdue = useMemo(() => {
    if (!selectedAssignment?.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(selectedAssignment.dueDate);
    return today > dueDate;
  }, [selectedAssignment]);

  const studentSubmissions = useMemo(() => {
    if (!studentName) return [];
    return submissions
      .filter((s: Submission) => s.studentName.toLowerCase() === studentName.toLowerCase())
      .sort(
        (a: Submission, b: Submission) =>
          new Date(assignments.find((asg: Assignment) => asg.id === b.assignmentId)?.date || 0).getTime() -
          new Date(assignments.find((asg: Assignment) => asg.id === a.assignmentId)?.date || 0).getTime()
      );
  }, [submissions, studentName, assignments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = error => reject(error);
      });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssignmentId || !file || !studentName) {
      setError('Vui lòng nhập tên, chọn lớp, bài tập và tải lên một file.');
      return;
    }
    const assignment = assignments.find((a: Assignment) => a.id === selectedAssignmentId);
    if (!assignment) {
      setError('Không tìm thấy bài tập đã chọn.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const transcript = await generateTranscript(file);
      const fileData = await fileToBase64(file);
      
      const newSubmissionPayload = {
        studentName,
        assignmentId: selectedAssignmentId,
        classId: selectedClassId,
        transcript,
        submissionFileName: file.name,
        file: {
          data: fileData,
          name: file.name,
          type: file.type,
        },
      };

      await api.submitCreate(newSubmissionPayload);
      await fetchData();

      setSuccessMessage('Bài tập đã được nộp thành công! Bạn có thể tự động chấm điểm.');
      setSelectedClassId('');
      setSelectedAssignmentId('');
      setFile(null);
      formRef.current?.reset();
    } catch (err) {
      console.error(err);
      setError('Đã xảy ra lỗi trong quá trình nộp bài. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoGrade = async (submission: Submission) => {
    setGradingId(submission.id);
    setError('');
    setSuccessMessage('');
    try {
      const assignment = assignments.find((a: Assignment) => a.id === submission.assignmentId);
      if (!assignment || !submission.transcript) throw new Error('Không tìm thấy bài tập hoặc transcript.');

      const sampleTranscript = assignment.sampleVideoTranscript || '';
      let isMatch = true;

      if (!assignment.isFreestyle && sampleTranscript) {
        const similarityResult = await checkContentSimilarity(submission.transcript, sampleTranscript);
        isMatch = similarityResult.isMatch;
      }

      if (!isMatch) {
        await api.scoreUpdate({
          submissionId: submission.id,
          contentMismatched: true,
          status: 'pending'
        });
        await fetchData();
        setError(
          'Nội dung bài nộp không khớp với video mẫu. Bài của bạn đã được đánh dấu để giáo viên xem xét lại. Bạn có thể nộp lại.'
        );
        setGradingId(null);
        return;
      }

      const { score, feedback } = await generateGradeAndFeedback(
        submission.studentName,
        assignment.title,
        submission.transcript,
        sampleTranscript
      );

      await api.scoreUpdate({
        submissionId: submission.id,
        score,
        feedback,
        status: 'graded',
        contentMismatched: false,
      });
      await fetchData();

    } catch (err) {
      console.error(err);
      setError('Không thể chấm điểm tự động. Vui lòng thử lại sau.');
    } finally {
      setGradingId(null);
    }
  };

  const handleStartResubmit = (submission: Submission) => {
    setSelectedClassId(submission.classId);
    setSelectedAssignmentId(submission.assignmentId);
    setFile(null);
    const fileInput = document.getElementById('file-upload') as HTMLInputElement | null;
    if (fileInput) fileInput.value = '';
    setError('');
    setSuccessMessage('');
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newClassId = e.target.value;
    setSelectedClassId(newClassId);
    const assignmentsForClass = assignments.filter((a: Assignment) => a.classId === newClassId);
    setSelectedAssignmentId(assignmentsForClass.length > 0 ? assignmentsForClass[0].id : '');
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64">
          <Spinner size="lg" />
          <p className="mt-4 text-slate-500">Đang tải dữ liệu lớp học...</p>
      </div>
    );
  }

  if (!loading && classes.length === 0) {
    return (
      <Card>
        <div className="text-center p-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="mt-4 text-2xl font-bold text-slate-800">Chưa có Lớp học nào</h2>
            <p className="mt-2 text-slate-500">
                Hiện tại hệ thống chưa có thông tin lớp học. Vui lòng liên hệ với Ms Hồng để được hỗ trợ.
            </p>
            <div className="mt-6 text-xs text-slate-400 bg-slate-50 p-3 rounded-md">
                <p><span className="font-semibold">Ghi chú cho Quản trị viên:</span> Đảm bảo trang tính "Classes" trong Google Sheet của bạn có dữ liệu và đã được điền đúng cách.</p>
            </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Nộp bài của bạn</h2>
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="student-name" className="block text-sm font-medium text-slate-700">
              Tên của bạn
            </label>
            <input
              type="text"
              id="student-name"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Bạn vui lòng nhập họ tên"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class-select" className="block text-sm font-medium text-slate-700">
                Chọn lớp
              </label>
              <select
                id="class-select"
                value={selectedClassId}
                onChange={handleClassChange}
                disabled={!studentName}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn một lớp --</option>
                {classes.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="assignment-select" className="block text-sm font-medium text-slate-700">
                Chọn bài tập
              </label>
              <select
                id="assignment-select"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                disabled={!selectedClassId || !studentName}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm rounded-md disabled:bg-slate-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Chọn một bài tập --</option>
                {filteredAssignments.map((a: Assignment) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.date})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!!selectedAssignment?.isFreestyle && (
            <div
              className="p-3 bg-blue-100 border-l-4 border-blue-400 text-blue-800 text-sm rounded-r-md"
              role="alert"
            >
              <p>
                <span className="font-bold">Chủ đề tự chọn:</span> Bạn có thể nói về bất kỳ nội dung nào liên quan đến
                tiêu đề bài tập.
              </p>
            </div>
          )}

          {selectedAssignment && isOverdue && (
            <div
              className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-md"
              role="alert"
            >
              <p>
                <span className="font-bold">Cảnh báo:</span> Bài tập này đã quá hạn nộp. Hạn chót là ngày{' '}
                {new Date(selectedAssignment.dueDate!).toLocaleDateString('vi-VN')}.
              </p>
            </div>
          )}

          {selectedAssignment?.sampleVideoUrls?.length > 0 && (
            <div className="space-y-4 rounded-lg bg-slate-50 p-4">
              {selectedAssignment.sampleVideoUrls.map((url, idx) => (
                <div key={idx}>
                  <h4 className="font-semibold text-slate-700 mb-2">
                    Video mẫu {selectedAssignment.sampleVideoUrls.length > 1 ? idx + 1 : ''}
                  </h4>
                  <div className="aspect-video w-full">
                    <video controls preload="metadata" src={url} className="w-full h-full rounded-md bg-black">
                      Trình duyệt của bạn không hỗ trợ thẻ video.
                    </video>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-slate-700">
              Tải lên file Audio/Video của bạn
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-slate-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="flex text-sm text-slate-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-pink-600 hover:text-pink-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-pink-500"
                  >
                    <span>Tải lên một file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      onChange={handleFileChange}
                      accept="audio/*,video/*"
                    />
                  </label>
                  <p className="pl-1">hoặc kéo và thả</p>
                </div>
                {file ? (
                  <p className="text-sm text-slate-500">{file.name}</p>
                ) : (
                  <p className="text-xs text-slate-500">MP3, WAV, MP4, MOV</p>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 text-center font-semibold">{error}</p>}
          {successMessage && (
            <div className="p-3 bg-green-100 border-l-4 border-green-500 text-green-800 text-sm rounded-r-md" role="alert">
              <p>{successMessage}</p>
            </div>
          )}

          <div className="text-right">
            <Button type="submit" disabled={isLoading || !selectedAssignmentId || !file || !studentName}>
              {isLoading && <Spinner size="sm" />}
              <span>{isLoading ? 'Đang nộp...' : 'Nộp bài'}</span>
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Bài đã nộp</h2>
        <div className="space-y-4">
          {!studentName ? (
            <Card>
              <p className="text-slate-500">Vui lòng nhập tên của bạn ở trên để xem các bài đã nộp.</p>
            </Card>
          ) : studentSubmissions.length === 0 ? (
            <Card>
              <p className="text-slate-500">Bạn chưa có bài nộp nào.</p>
            </Card>
          ) : (
            studentSubmissions.map((sub: Submission) => {
              const assignment = assignments.find((a: Assignment) => a.id === sub.assignmentId)!;
              const aClass = classes.find((c: any) => c.id === assignment?.classId)!;
              const isGradingCurrent = gradingId === sub.id;
              const isExpanded = expandedSubmissionId === sub.id;

              const getScoreColor = (score: number | undefined) => {
                if (score === undefined) return 'border-slate-300';
                if (score >= 8.5) return 'border-green-500';
                if (score >= 6.5) return 'border-yellow-500';
                return 'border-red-500';
              };

              const isAssignmentOverdue = assignment ? new Date() > new Date(assignment.dueDate!) : false;

              const renderStatus = () => {
                if (sub.status === 'graded') {
                  return (
                    <div className={`h-20 w-20 rounded-full flex flex-col items-center justify-center border-4 ${getScoreColor(sub.score)}`}>
                      <span className="text-2xl font-bold text-slate-800">{sub.score?.toFixed(1)}</span>
                      <span className="text-xs text-slate-500">/10</span>
                    </div>
                  );
                }
                if (sub.contentMismatched) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="inline-flex items-center px-3 py-1 text-sm leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Chờ GV</span>
                      </div>
                    </div>
                  );
                }
                if (isAssignmentOverdue) {
                  return (
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="inline-flex items-center px-3 py-1 text-sm leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-9a1 1 0 112 0v2a1 1 0 11-2 0V9zm1-4a1 1 0 100 2 1 1 0 000-2z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>Quá hạn</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="inline-flex items-center px-3 py-1 text-sm leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Chờ chấm</span>
                    </div>
                  </div>
                );
              };

              return (
                <Card key={sub.id} className="p-0 overflow-visible">
                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-pink-600">{aClass?.name || '—'}</p>
                          <button
                            onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                            className="md:hidden p-1 text-slate-400 hover:text-slate-600"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-6 w-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mt-1">{assignment?.title || '—'}</h3>
                        <p className="text-sm text-slate-500 mt-1">Đã nộp: {sub.submissionFileName}</p>
                        {sub.transcript && (
                          <blockquote className="text-sm text-slate-600 mt-3 italic border-l-4 pl-3">
                            "{sub.transcript.substring(0, 100)}
                            {sub.transcript.length > 100 ? '...' : ''}"
                          </blockquote>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-center flex flex-col items-center justify-center gap-2">
                        {renderStatus()}
                        <button
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : sub.id)}
                          className="hidden md:flex items-center text-sm text-slate-500 hover:text-pink-600 mt-2"
                        >
                          <span>{isExpanded ? 'Thu gọn' : 'Chi tiết'}</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-5 w-5 ml-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`transition-all duration-500 ease-in-out max-h-0 overflow-hidden ${isExpanded ? 'max-h-[1000px]' : ''}`}>
                    <div className="bg-slate-50/75 p-6 border-t border-slate-200 space-y-4">
                      {sub.contentMismatched && sub.status === 'pending' && (
                        <div className="p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-800 text-sm rounded-r-md">
                          <p className="font-semibold">Nội dung không khớp. Giáo viên sẽ xem xét bài nộp này.</p>
                        </div>
                      )}
                      {sub.transcript && (
                        <div>
                          <h4 className="font-semibold text-slate-700">Transcript (AI-Generated):</h4>
                          <p className="text-sm text-slate-600 mt-1 p-3 bg-white rounded-md italic whitespace-pre-wrap">"{sub.transcript}"</p>
                        </div>
                      )}
                      {sub.feedback && (
                        <div>
                          <h4 className="font-semibold text-slate-700 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span>Nhận xét (AI-Generated):</span>
                          </h4>
                          <div className="text-sm text-slate-700 mt-2 p-4 bg-pink-50 rounded-lg whitespace-pre-wrap leading-relaxed border border-pink-100">
                            {sub.feedback}
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end space-x-2 pt-2">
                        {sub.status === 'pending' && !sub.contentMismatched && (
                          <Button onClick={() => handleAutoGrade(sub)} disabled={isGradingCurrent}>
                            {isGradingCurrent && <Spinner size="sm" />}
                            <span>{isGradingCurrent ? 'Đang chấm...' : 'Tự động chấm điểm'}</span>
                          </Button>
                        )}
                        <Button variant="secondary" onClick={() => handleStartResubmit(sub)}>
                          Nộp lại
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentView;
