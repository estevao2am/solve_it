import { Module } from '@nestjs/common';

import { ProfessionalProfileService } from './professional.service';
import { ProfessionalProfileController } from './professional.controller';

import { ProfessionalDocumentController } from 'src/documents/professional-document.controller';
import { ProfessionalDocumentService } from 'src/documents/professional-document.service';

import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],

  controllers: [ProfessionalProfileController, ProfessionalDocumentController],

  providers: [ProfessionalProfileService, ProfessionalDocumentService],

  exports: [ProfessionalProfileService, ProfessionalDocumentService],
})
export class ProfessionalModule {}
