import { PrismaService } from '@/services/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { ParsedQuestion, RawExcelRow } from './dto/importExcel.dto';

@Injectable()
export class ExcelImportService {
  constructor(private prisma: PrismaService) {}

  async importQuestions(examId: number, fileBuffer: Buffer) {
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json<RawExcelRow>(
      workbook.Sheets[workbook.SheetNames[0]],
    );
    if (!rows.length) throw new BadRequestException('File rỗng!');

    const questionsToInsert: ParsedQuestion[] = [];

    rows.forEach((row, index) => {
      // 1. Kiểm tra rỗng
      // 2. Lặp qua 4 cột đáp án, tìm dấu '*' để set isCorrect = true, sau đó cắt dấu '*' đi
      // 3. Push vào mảng questionsToInsert
    });

    // 4. Lưu DB
    return this.prisma.$transaction(async (tx) => {
      let count = 0;
      for (let i = 0; i < questionsToInsert.length; i++) {
        await tx.question.create({
          data: {
            examId: examId,
            content: questionsToInsert[i].content,
            orderIndex: i + 1,
            options: { createMany: { data: questionsToInsert[i].options } },
          },
        });
        count++;
      }
      return { message: `Import thành công ${count} câu hỏi!` };
    });
  }
}
