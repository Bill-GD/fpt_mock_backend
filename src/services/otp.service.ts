import { Injectable } from '@nestjs/common';
import otp from 'otp-generator';

@Injectable()
export class OtpService {
  generateOTP(): string {
    return otp.generate(8, {
      specialChars: false,
      upperCaseAlphabets: false,
    });
  }
}
