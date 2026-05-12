import { Result } from '@/common/utils/result';
import { PrismaService } from '@/services/prisma.service';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiGenerateService {
  private genAI: GoogleGenerativeAI;

  constructor(private readonly prisma: PrismaService) {
    // Khởi tạo Gemini Client với API Key từ biến môi trường
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  }

  async generateQuestions(
    examId: number,
    topic: string,
    difficulty: string,
    quantity: number,
  ) {
    // 1. Kiểm tra xem Exam có tồn tại không
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return Result.fail(`Exam #${examId} không tồn tại`);
    }

    try {
      // 2. Gọi AI thực tế để lấy dữ liệu
      const generatedQuestions = await this.fetchFromAI(topic, difficulty, quantity);

      if (!generatedQuestions || !Array.isArray(generatedQuestions) || generatedQuestions.length === 0) {
        return Result.fail('AI không trả về được dữ liệu hợp lệ. Vui lòng thử lại!');
      }

      // 3. Lưu vào Database
      await this.prisma.$transaction(async (tx) => {
        // Đã xóa phần query lastQuestion và orderIndex

        for (const q of generatedQuestions) {
          await tx.question.create({
            data: {
              examId: examId,
              content: q.content,
              // Đã xóa trường orderIndex ở đây
              options: {
                create: q.options.map((o: any) => ({
                  content: o.content,
                  isCorrect: o.isCorrect,
                })),
              },
            },
          });
        }
      });

      return Result.ok(`Đã tạo và lưu thành công ${generatedQuestions.length} câu hỏi từ AI!`, {
        count: generatedQuestions.length
      });

    } catch (error) {
      console.error('Lỗi GenAI Service:', error);
      return Result.fail('Hệ thống AI đang quá tải hoặc gặp lỗi khi lưu dữ liệu!');
    }
  }

  // --- Hàm tương tác trực tiếp với Prompt và API ---
  private async fetchFromAI(topic: string, difficulty: string, quantity: number) {
    // Dùng model gemini-1.5-flash vì nó tối ưu cho tốc độ và các task sinh JSON
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json', // Tính năng xịn: Ép AI chỉ trả về text định dạng JSON
      },
    });

    // Viết Prompt kỹ (Prompt Engineering) để AI tuân thủ đúng luật của bài thi
    const prompt = `
      Bạn là một chuyên gia giáo dục xuất sắc. 
      Hãy tạo ĐÚNG ${quantity} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó là "${difficulty}".
      
      Yêu cầu BẮT BUỘC:
      1. Kết quả trả về phải là một mảng (array) các object JSON.
      2. Mỗi câu hỏi phải có cấu trúc chính xác như sau:
      {
        "content": "Nội dung câu hỏi?",
        "options": [
          { "content": "Đáp án thứ nhất", "isCorrect": true },
          { "content": "Đáp án thứ hai", "isCorrect": false },
          { "content": "Đáp án thứ ba", "isCorrect": false },
          { "content": "Đáp án thứ tư", "isCorrect": false }
        ]
      }
      3. Mỗi câu hỏi phải có ĐÚNG 4 đáp án.
      4. Trong 4 đáp án, chỉ được phép có DUY NHẤT 1 đáp án có "isCorrect": true, các đáp án còn lại phải là false.
      5. Hãy TRỘN NGẪU NHIÊN vị trí của đáp án đúng (không được để đáp án đúng luôn nằm ở lựa chọn đầu tiên).
      6. Nội dung bằng Tiếng Việt chuẩn.
    `;

    // Gửi yêu cầu lên AI
    const result = await model.generateContent(prompt);

    // Lấy text JSON trả về
    const responseText = result.response.text();

    // Parse từ text sang Array JS
    const parsedData = JSON.parse(responseText);

    return parsedData;
  }
}