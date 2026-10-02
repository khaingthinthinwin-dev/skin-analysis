import { Module } from '@nestjs/common';
import { SkinAnalysisController } from './skin-analysis.controller';
import { SkinAnalysisService } from './skin-analysis.service';
import { AiGatewayService } from './services/ai-gateway.service';
import { SkinScanStorageService } from './services/skin-scan-storage.service';
import { PdfReportService } from './services/pdf-report.service';

@Module({
  controllers: [SkinAnalysisController],
  providers: [
    SkinAnalysisService,
    AiGatewayService,
    SkinScanStorageService,
    PdfReportService,
  ],
  exports: [SkinAnalysisService, AiGatewayService],
})
export class SkinAnalysisModule {}
