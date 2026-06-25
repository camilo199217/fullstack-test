import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';

@ApiTags('chatbot')
@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Receives a user enquiry and returns the chatbot's final response.
   * Internally uses OpenAI Function Calling with searchProducts and convertCurrencies tools.
   * Errors are handled globally by HttpExceptionFilter.
   */
  @Post('message')
  @ApiOperation({ summary: 'Send a message to the chatbot' })
  @ApiResponse({
    status: 201,
    description: 'The chatbot response',
    schema: {
      example: { response: 'Here are some phones I found for you...' },
    },
  })
  async sendMessage(
    @Body() dto: ChatMessageDto,
  ): Promise<{ response: string }> {
    const response = await this.chatbotService.chat(dto.message);
    return { response };
  }
}
