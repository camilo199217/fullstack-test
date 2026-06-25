import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ChatMessageDto {
  @ApiProperty({
    description: "The user's enquiry message to the chatbot",
    example: 'I am looking for a phone',
  })
  @IsString()
  @IsNotEmpty()
  // Cap input length to limit prompt injection payloads and control token costs.
  // A legitimate product/currency question never needs more than 500 characters.
  @MaxLength(500)
  // Strip leading/trailing whitespace and collapse repeated whitespace to a single
  // space — removes zero-width characters and other invisible Unicode tricks
  // commonly used to hide injected instructions inside seemingly normal text.
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
  )
  message: string;
}
