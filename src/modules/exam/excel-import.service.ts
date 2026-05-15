import { Result } from '@/common/utils/result';
import { PrismaService } from '@/services/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as xlsx from 'xlsx';
import { ParsedOption, ParsedQuestion } from './dto/importExcel.dto';

@Injectable()
export class ExcelImportService {
  constructor(private prisma: PrismaService) {}

  async importQuestions(examId: number, fileBuffer: Buffer) {
    // 1. Kiểm tra xem Exam có tồn tại không
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });
    if (!exam) {
      return Result.fail(`Exam #${examId} không tồn tại`);
    }

    // 2. Đọc file Excel
    const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
    const rows = xlsx.utils.sheet_to_json<any>( // Tạm để any hoặc bạn tự cập nhật lại interface RawExcelRow
      workbook.Sheets[workbook.SheetNames[0]],
      // defval: null giúp các ô trống không bị undefined mà sẽ là null
      { defval: null },
    );

    if (!rows.length) {
      throw new BadRequestException('File rỗng hoặc không đúng định dạng!');
    }

    const questionsToInsert: ParsedQuestion[] = [];

    // 3. Xử lý logic parse dữ liệu
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNumber = index + 2; // Dòng 1 là Header trong Excel

      // Lấy theo tên cột mới
      const content = row['content'];
      if (!content || String(content).trim() === '') {
        throw new BadRequestException(
          `Lỗi dòng ${rowNumber}: Thiếu nội dung câu hỏi (cột 'content')!`,
        );
      }

      // Lấy đáp án đúng từ cột answer
      const answerVal = row['answer'];
      if (!answerVal || String(answerVal).trim() === '') {
        throw new BadRequestException(
          `Lỗi dòng ${rowNumber}: Thiếu đáp án đúng (cột 'answer')!`,
        );
      }

      // Chuyển về in hoa để dễ so sánh (vd: 'a' -> 'A')
      const correctAnswerLetter = String(answerVal).trim().toUpperCase();

      // Nhóm các đáp án lại để dễ xử lý vòng lặp
      const rawOptions = [
        { label: 'A' as const, value: row['A'] },
        { label: 'B' as const, value: row['B'] },
        { label: 'C' as const, value: row['C'] },
        { label: 'D' as const, value: row['D'] },
      ];

      const parsedOptions: ParsedOption[] = [];
      let hasCorrectAnswer = false;

      for (const opt of rawOptions) {
        // Bỏ qua nếu cột đáp án bị trống
        if (opt.value === null || String(opt.value).trim() === '') {
          continue;
        }

        const text = String(opt.value).trim();

        // So sánh nhãn của đáp án hiện tại (A/B/C/D) với giá trị ở cột answer
        const isCorrect = opt.label === correctAnswerLetter;

        if (isCorrect) {
          hasCorrectAnswer = true;
        }

        parsedOptions.push({
          label: opt.label,
          content: text,
          isCorrect,
        });
      }

      // Validate số lượng đáp án và đáp án đúng
      if (parsedOptions.length < 2) {
        throw new BadRequestException(
          `Lỗi dòng ${rowNumber}: Cần ít nhất 2 đáp án!`,
        );
      }

      if (!hasCorrectAnswer) {
        throw new BadRequestException(
          `Lỗi dòng ${rowNumber}: Đáp án đúng '${correctAnswerLetter}' không khớp với bất kỳ cột đáp án nào có dữ liệu!`,
        );
      }

      questionsToInsert.push({
        content: String(content).trim(),
        options: parsedOptions,
      });
    }

    // 4. Lưu vào Database bằng Transaction
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const q of questionsToInsert) {
          await tx.question.create({
            data: {
              examId: examId,
              content: q.content,
              options: {
                create: q.options.map((o) => ({
                  content: o.content,
                  isCorrect: o.isCorrect,
                })),
              },
            },
          });
        }
      });

      return Result.ok('Import Excel thành công!', {
        importedCount: questionsToInsert.length,
      });
    } catch (error) {
      console.error(error);
      return Result.fail('Lỗi hệ thống khi lưu vào cơ sở dữ liệu!');
    }
  }
}
