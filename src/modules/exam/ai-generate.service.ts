import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../../services/prisma.service';
import { ParsedQuestion } from './dto/importExcel.dto';

@Injectable()
export class AiGenerateService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

  constructor(private prisma: PrismaService) {}

  async generateQuestions(examId: number, topic: string, diff: string, qty: number) {
    const model = this.genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      generationConfig: { responseMimeType: "application/json" } // Ép JSON Mode
    });

    const prompt = `Tạo ${qty} câu hỏi trắc nghiệm chủ đề "${topic}", độ khó "${diff}". TRẢ VỀ JSON ARRAY: [{"content": "...", "options": [{"label": "A", "content": "...", "isCorrect": true}]}]`;
    
    const result = await model.generateContent(prompt);
    const generatedQuestions: ParsedQuestion[] = JSON.parse(result.response.text());

    const lastQ = await this.prisma.question.findFirst({ where: { examId }, orderBy: { orderIndex: 'desc' } });
    let nextIndex = lastQ ? lastQ.orderIndex + 1 : 1;

    return this.prisma.$transaction(async (tx) => {
      // Vòng lặp lưu DB y hệt bên ExcelImportService
    });
  }
}