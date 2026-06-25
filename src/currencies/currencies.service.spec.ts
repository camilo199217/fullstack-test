/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CurrenciesService } from './currencies.service';
import axios from 'axios';

// Mock axios so no real HTTP calls are made during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CurrenciesService', () => {
  let service: CurrenciesService;

  // Simulated exchange rates (base: USD) from Open Exchange Rates API
  const mockRates = {
    USD: 1,
    EUR: 0.92,
    CAD: 1.36,
    COP: 4100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CurrenciesService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('fake-app-id'),
          },
        },
      ],
    }).compile();

    service = module.get<CurrenciesService>(CurrenciesService);

    // Return mock rates for every axios.get call
    mockedAxios.get.mockResolvedValue({ data: { rates: mockRates } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convertCurrencies', () => {
    it('should convert USD to EUR correctly', async () => {
      const result = await service.convertCurrencies(100, 'USD', 'EUR');
      // 100 USD → 100 / 1 * 0.92 = 92 EUR
      expect(result).toBe('100 USD = 92.00 EUR');
    });

    it('should convert EUR to CAD correctly', async () => {
      const result = await service.convertCurrencies(350, 'EUR', 'CAD');
      // 350 EUR → 350 / 0.92 * 1.36 ≈ 517.39 CAD
      const expected = ((350 / 0.92) * 1.36).toFixed(2);
      expect(result).toBe(`350 EUR = ${expected} CAD`);
    });

    it('should return an error message for unsupported source currency', async () => {
      const result = await service.convertCurrencies(100, 'XYZ', 'USD');
      expect(result).toBe('Currency XYZ is not supported.');
    });

    it('should return an error message for unsupported target currency', async () => {
      const result = await service.convertCurrencies(100, 'USD', 'XYZ');
      expect(result).toBe('Currency XYZ is not supported.');
    });

    it('should be case-insensitive for currency codes', async () => {
      const result = await service.convertCurrencies(100, 'usd', 'eur');
      expect(result).toBe('100 USD = 92.00 EUR');
    });

    it('should call the Open Exchange Rates API with the configured app id', async () => {
      await service.convertCurrencies(100, 'USD', 'EUR');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('fake-app-id'),
      );
    });
  });
});
