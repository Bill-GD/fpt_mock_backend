import { Controller, Post, Param, Body, UploadedFile, UseInterceptors, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ExcelImportService } from '../exam/excel-import.service';
import { AiGenerateService } from '../exam/ai-generate.service';
import { Multer } from 'multer'
@Controller('exams')
export class ExamsController {
  constructor(
  ) {}

}
