import { RequesterID } from '@/common/decorators';
import { AuthenticatedGuard } from '@/common/guards/authenticated.guard';
import { ExamQuery } from '@/common/queries/exam.query';
import { ControllerResponse } from '@/common/utils/controller-response';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Response } from 'express';
import { AiGenerateService } from './ai-generate.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamService } from './exam.service';
import { ExcelImportService } from './excel-import.service';

@Controller('exams')
@UseGuards(AuthenticatedGuard)
export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private excelService: ExcelImportService,
    private aiService: AiGenerateService,
  ) {}

  @Post()
  async create(@RequesterID() requesterId: number, @Body() dto: CreateExamDto) {
    const res = await this.examService.create(requesterId, dto);
    return ControllerResponse.ok(HttpStatus.CREATED, res);
  }

  @Get()
  async findAll(
    @Res({ passthrough: true }) response: Response,
    @RequesterID() requesterId: number,
    @Query() query: ExamQuery,
  ) {
    const res = await this.examService.findAll(requesterId, query);
    if (!res.success) {
      throw new BadRequestException(res.message);
    }
    response.setHeader('X-Total-Count', `${res.data.total}`);
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const res = await this.examService.findOne(id);
    if (!res.success) {
      throw new NotFoundException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.OK, res);
  }

  @Patch(':id')
  async update(
    @RequesterID() requesterId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExamDto,
  ) {
    const res = await this.examService.update(id, requesterId, dto);
    if (!res.success) {
      if (res.message.toLowerCase().includes('forbid')) {
        throw new ForbiddenException(res.message);
      }
      if (
        res.message.toLowerCase().includes("doesn't") ||
        res.message.toLowerCase().includes('not found')
      ) {
        throw new NotFoundException(res.message);
      }
      throw new BadRequestException(res.message);
    }
    return ControllerResponse.ok(HttpStatus.NO_CONTENT, res);
  }

  @Post(':id/import-excel')
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.excelService.importQuestions(id, file.buffer);
  }

  @Post(':id/generate-ai')
  async generateAi(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { topic: string; difficulty: string; quantity: number },
  ) {
    return this.aiService.generateQuestions(
      id,
      body.topic,
      body.difficulty,
      body.quantity,
    );
  }
}
