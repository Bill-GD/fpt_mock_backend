import { Controller, Post, Param, Body, UploadedFile, UseInterceptors, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelImportService } from './excel-import.service';
import { AiGenerateService } from './ai-generate.service';
import { Multer } from 'multer'
@Controller('exams')
export class ExamsController {
  constructor(
    private excelService: ExcelImportService,
    private aiService: AiGenerateService
  ) {}

  @Post(':id/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Vui lòng upload file!');
    return this.excelService.importQuestions(id, file.buffer);
  }

  @Post(':id/generate-ai')
  async generateAi(@Param('id', ParseIntPipe) id: number, @Body() body: { topic: string; difficulty: string; quantity: number }) {
    return this.aiService.generateQuestions(id, body.topic, body.difficulty, body.quantity);
  }
}