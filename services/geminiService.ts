import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("Không tìm thấy khóa API Gemini. Vui lòng đặt biến môi trường API_KEY.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

// Helper function to convert File to a format GoogleGenerativeAI can use
const fileToGenerativePart = async (file: File) => {
  const base64EncodedData = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const transcribeTeacherVideo = async (videoFile: File): Promise<string> => {
  if (!API_KEY) {
    // Trả về một bản ghi mẫu nếu không có khóa API
    return `Xin chào mọi người. Đây là một bản ghi mẫu được tạo vì thiếu khóa API. Không thể xử lý nội dung thực tế của video "${videoFile.name}" của bạn. Một câu trả lời mẫu sẽ rõ ràng, súc tích và sử dụng từ vựng phù hợp.`;
  }
  try {
    const videoPart = await fileToGenerativePart(videoFile);
    const prompt = "Bạn là một dịch vụ chuyển lời nói thành văn bản. Phiên âm chính xác âm thanh từ tệp video được cung cấp. Chỉ xuất ra văn bản phiên âm thuần túy.";

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [videoPart, {text: prompt}] }],
    });

    return response.text.trim();
  } catch (error) {
    console.error("Lỗi khi phiên âm video của giáo viên:", error);
    throw new Error("Không thể tạo bản ghi cho video.");
  }
};

export const generateTranscript = async (file: File): Promise<string> => {
  if (!API_KEY) {
    // Trả về một bản ghi mẫu nếu không có khóa API
    return `Đây là một bản ghi mẫu cho tệp: "${file.name}". Dường như khóa API Gemini chưa được cấu hình. Để có bản ghi thật, vui lòng đảm bảo khóa API được thiết lập chính xác. Một học sinh trình độ B1 có thể nói điều gì đó như: "Hello, my topic is... uh... my last vacation. I go to the beach. It was very fun. The weather is hot and I swim in the sea. I eat many seafood. It is delicious."`;
  }
  try {
    const filePart = await fileToGenerativePart(file);
    const prompt = "Bạn là một dịch vụ chuyển lời nói thành văn bản. Phiên âm chính xác âm thanh từ tệp được cung cấp. Người nói có khả năng là người học tiếng Anh trình độ B1, vì vậy hãy chuẩn bị cho một số phát âm hoặc ngữ pháp không chuẩn. Chỉ xuất ra văn bản phiên âm thuần túy.";
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [filePart, {text: prompt}] }],
    });
    
    return response.text.trim();
  } catch (error) {
    console.error("Lỗi khi tạo bản ghi:", error);
    return "Lỗi: Không thể tạo bản ghi. Vui lòng thử lại.";
  }
};

export const checkContentSimilarity = async (studentTranscript: string, teacherTranscript: string): Promise<{ isMatch: boolean }> => {
    if (!API_KEY || !teacherTranscript) {
        // Mặc định là khớp nếu không có khóa API hoặc không có video mẫu để so sánh
        return { isMatch: true };
    }
    try {
        const prompt = `You are an AI assistant. Compare the student's transcript with the teacher's model transcript for a speaking assignment.
        Teacher's Model Transcript: "${teacherTranscript}"
        Student's Transcript: "${studentTranscript}"
        
        Determine if the student is talking about the same core topic as the model. The student doesn't need to use the exact same words, but the subject must be the same (e.g., both are about hobbies, both are about a vacation).
        Respond ONLY with a JSON object with a single key "isMatch" which is a boolean.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        isMatch: { type: Type.BOOLEAN }
                    },
                    required: ["isMatch"]
                },
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Lỗi khi kiểm tra sự tương đồng nội dung:", error);
        // Mặc định là true để không chặn người dùng trong trường hợp có lỗi
        return { isMatch: true };
    }
};


export const generateGradeAndFeedback = async (studentName: string, assignmentTitle: string, transcript: string, sampleTranscript: string): Promise<{ score: number; feedback: string; }> => {
    if (!API_KEY) {
        // Trả về một kết quả mẫu nếu không có khóa API
        console.log("Không có API key, trả về kết quả chấm điểm mẫu.");
        return {
            score: 7.5,
            feedback: `Chào ${studentName} thân mến, đây là nhận xét mẫu vì API key chưa được cấu hình.
Con đã diễn đạt ý chính khá tốt, nhưng cần chú ý hơn đến việc phát âm các âm cuối.
Hãy tiếp tục luyện tập nhé! Cô tin con sẽ tiến bộ rất nhanh!`
        };
    }

    const freestyleNote = !sampleTranscript 
        ? "This is a freestyle (open topic) assignment, so there is no model transcript for comparison. Evaluate the student based on general speaking skills shown in their transcript (pronunciation, grammar, vocabulary usage, and fluency). Do not penalize them for the topic choice."
        : `Teacher's Model Transcript (For context on what was expected): "${sampleTranscript}"`;

    try {
        const prompt = `You are a friendly and encouraging female English teacher from Vietnam. Your name is 'cô'. You are grading a speaking assignment for your student.
        
        Student's Name: "${studentName}"
        Assignment Title: "${assignmentTitle}"
        ${freestyleNote}
        Student's Transcript to evaluate: "${transcript}"
        
        Your task:
        1. Adopt the persona of a kind Vietnamese female teacher ("cô").
        2. Address the student directly and warmly by their name, for example: "Chào ${studentName} thân mến,".
        3. The main grading focus is **pronunciation**. Analyze the student's transcript for potential pronunciation mistakes, considering common errors for Vietnamese learners (e.g., missing ending sounds like /s/, /t/, /k/, incorrect vowel sounds).
        4. Provide a score out of 10, primarily based on pronunciation clarity and accuracy.
        5. Write detailed, constructive feedback **in Vietnamese**. The feedback must be easy to read. Use newline characters (\\n) to create separate paragraphs for the introduction, each point of feedback, and the conclusion.
        6. For any identified pronunciation issues, explain the error simply and provide clear, actionable advice on how to correct it. For example, "Với từ 'like', con nhớ bật âm /k/ ở cuối nhé. Thay vì đọc là 'lai' thì mình sẽ đọc là 'laik'."
        7. Maintain a warm, supportive, and personal tone throughout. Use "cô" to refer to yourself and "con" to refer to the student. End with an encouraging sentence like "Cô tin con sẽ tiến bộ rất nhanh!".
        
        Example of a well-formatted feedback structure:
        "Chào [Student's Name] thân mến, cô rất vui khi nghe con nói tiếng Anh qua bài tập này!\\n\\nCon đã thể hiện được khả năng giao tiếp rất tốt.\\n\\nVề phần phát âm, cô thấy con có một vài điểm nhỏ có thể cải thiện để phát âm chuẩn hơn nữa nhé:\\n- Âm cuối (ending sounds): Với từ 'is', con nhớ bật âm /z/ nhé.\\n- Âm 'th': Với từ 'this', con cần đặt lưỡi giữa hai hàm răng và đẩy hơi ra.\\n\\nCô biết việc luyện phát âm cần thời gian và sự kiên nhẫn. Con cứ tiếp tục luyện tập thật nhiều nhé! Cô luôn ở đây để hỗ trợ con. Cố lên con nhé!"
        
        Output your response as a JSON object with two keys: "score" (a number from 0 to 10) and "feedback" (a string in Vietnamese).`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        score: {
                            type: Type.NUMBER,
                            description: "Điểm từ 0 đến 10, tập trung vào phát âm."
                        },
                        feedback: {
                            type: Type.STRING,
                            description: "Nhận xét mang tính xây dựng bằng tiếng Việt, với giọng văn của một giáo viên thân thiện, tập trung vào cách sửa lỗi phát âm và được định dạng rõ ràng bằng các ký tự xuống dòng (\\n)."
                        }
                    },
                    required: ["score", "feedback"]
                },
            },
        });

        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        
        // Đảm bảo điểm số nằm trong khoảng 0-10
        result.score = Math.max(0, Math.min(10, result.score));

        return result;

    } catch (error) {
        console.error("Lỗi khi chấm điểm tự động:", error);
        throw new Error("Không thể chấm điểm tự động. Vui lòng thử lại.");
    }
};