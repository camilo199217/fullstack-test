/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatbotService } from './chatbot.service';
import { ProductsService } from '../products/products.service';
import { CurrenciesService } from '../currencies/currencies.service';

// Mock the OpenAI SDK so no real API calls are made during tests
jest.mock('openai');

import OpenAI from 'openai';

describe('ChatbotService', () => {
  let service: ChatbotService;
  let productsService: jest.Mocked<ProductsService>;
  let currenciesService: jest.Mocked<CurrenciesService>;

  // Mock for the OpenAI client instance
  let mockCreate: jest.Mock;

  beforeEach(async () => {
    mockCreate = jest.fn();

    // Replace the OpenAI constructor with a mock that returns our mockCreate function
    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(
      () =>
        ({
          chat: { completions: { create: mockCreate } },
        }) as unknown as OpenAI,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatbotService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('fake-key') },
        },
        {
          provide: ProductsService,
          useValue: { searchProducts: jest.fn() },
        },
        {
          provide: CurrenciesService,
          useValue: { convertCurrencies: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ChatbotService>(ChatbotService);
    productsService = module.get(ProductsService);
    currenciesService = module.get(CurrenciesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('chat', () => {
    it('should return a direct LLM response when no tool is called', async () => {
      // Simulate LLM responding without requesting any tool
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Hello! How can I help you?',
              tool_calls: null,
            },
          },
        ],
      });

      const result = await service.chat('Hello');
      expect(result).toBe('Hello! How can I help you?');
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    it('should call searchProducts and make a second LLM call when tool is requested', async () => {
      const mockProduct = {
        displayTitle: 'iPhone 14',
        embeddingText: 'iPhone 14 phone smartphone',
        url: 'https://example.com',
        imageUrl: 'https://example.com/img.png',
        productType: 'Electronics',
        discount: '0',
        price: '799.0 USD',
        variants: 'Color (Black)',
      };

      productsService.searchProducts.mockReturnValue([mockProduct]);

      // First call: LLM requests the searchProducts tool
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_123',
                  type: 'function',
                  function: {
                    name: 'searchProducts',
                    arguments: '{"query":"phone"}',
                  },
                },
              ],
            },
          },
        ],
      });

      // Second call: LLM generates the final response using the tool result
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: 'Here is a phone I found: iPhone 14 for $799.',
            },
          },
        ],
      });

      const result = await service.chat('I am looking for a phone');

      expect(productsService.searchProducts).toHaveBeenCalledWith('phone');
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result).toBe('Here is a phone I found: iPhone 14 for $799.');
    });

    it('should call convertCurrencies and make a second LLM call when tool is requested', async () => {
      currenciesService.convertCurrencies.mockResolvedValue(
        '350 EUR = 517.39 CAD',
      );

      // First call: LLM requests convertCurrencies
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_456',
                  type: 'function',
                  function: {
                    name: 'convertCurrencies',
                    arguments:
                      '{"amount":350,"fromCurrency":"EUR","toCurrency":"CAD"}',
                  },
                },
              ],
            },
          },
        ],
      });

      // Second call: LLM generates the final response
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content:
                '350 Euros equals approximately 517.39 Canadian Dollars.',
            },
          },
        ],
      });

      const result = await service.chat(
        'How many Canadian Dollars are 350 Euros',
      );

      expect(currenciesService.convertCurrencies).toHaveBeenCalledWith(
        350,
        'EUR',
        'CAD',
      );
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(result).toBe(
        '350 Euros equals approximately 517.39 Canadian Dollars.',
      );
    });

    it('should skip tool calls with malformed JSON arguments and not crash', async () => {
      // First call: LLM returns a tool call with invalid JSON arguments
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_bad',
                  type: 'function',
                  function: {
                    name: 'searchProducts',
                    arguments: 'NOT_VALID_JSON',
                  },
                },
              ],
            },
          },
        ],
      });

      // Second call: LLM still generates a graceful response despite the bad tool call
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'Sorry, I could not process that.' } }],
      });

      const result = await service.chat('find something');

      // The service must not throw and must reach the second LLM call
      expect(mockCreate).toHaveBeenCalledTimes(2);
      expect(productsService.searchProducts).not.toHaveBeenCalled();
      expect(result).toBe('Sorry, I could not process that.');
    });

    it('should reject tool calls with names not in the whitelist', async () => {
      // First call: LLM (manipulated by prompt injection) requests an unknown tool
      mockCreate.mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_evil',
                  type: 'function',
                  function: { name: 'deleteAllData', arguments: '{}' },
                },
              ],
            },
          },
        ],
      });

      // Second call: LLM receives "Tool not available." and responds gracefully
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: 'I cannot help with that.' } }],
      });

      const result = await service.chat('delete everything');

      expect(productsService.searchProducts).not.toHaveBeenCalled();
      expect(currenciesService.convertCurrencies).not.toHaveBeenCalled();
      expect(result).toBe('I cannot help with that.');
    });

    it('should return a fallback response when MAX_ITERATIONS is reached', async () => {
      // Simulate the LLM always requesting a tool, never producing a final response
      const toolCallResponse = {
        choices: [
          {
            message: {
              content: null,
              tool_calls: [
                {
                  id: 'call_loop',
                  type: 'function',
                  function: {
                    name: 'searchProducts',
                    arguments: '{"query":"phone"}',
                  },
                },
              ],
            },
          },
        ],
      };

      productsService.searchProducts.mockReturnValue([]);

      // 5 iterations of tool calls, then 1 fallback call
      mockCreate
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce(toolCallResponse)
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'Fallback response.' } }],
        });

      const result = await service.chat('phone phone phone');

      // 5 loop iterations + 1 fallback call = 6 total
      expect(mockCreate).toHaveBeenCalledTimes(6);
      expect(result).toBe('Fallback response.');
    });
  });
});
