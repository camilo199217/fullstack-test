import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { ExchangeRatesResponse } from './interfaces/exchange-rates-response.interface';

@Injectable()
export class CurrenciesService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Converts an amount from one currency to another using the Open Exchange Rates API.
   * Rates are fetched in real time on each call (base currency is always USD).
   *
   * @param amount - The amount to convert
   * @param fromCurrency - The source currency code (e.g. "USD", "EUR")
   * @param toCurrency - The target currency code (e.g. "CAD", "COP")
   * @returns A string describing the conversion result
   */
  async convertCurrencies(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<string> {
    const appId = this.configService.get<string>('OPEN_EXCHANGE_RATES_APP_ID');
    const url = `https://openexchangerates.org/api/latest.json?app_id=${appId}`;

    const response = await axios.get<ExchangeRatesResponse>(url);
    const rates = response.data.rates;

    const fromRate = rates[fromCurrency.toUpperCase()];
    const toRate = rates[toCurrency.toUpperCase()];

    if (!fromRate) {
      return `Currency ${fromCurrency} is not supported.`;
    }
    if (!toRate) {
      return `Currency ${toCurrency} is not supported.`;
    }

    // Convert to USD first (base currency), then to target currency
    const amountInUsd = amount / fromRate;
    const convertedAmount = amountInUsd * toRate;

    return `${amount} ${fromCurrency.toUpperCase()} = ${convertedAmount.toFixed(2)} ${toCurrency.toUpperCase()}`;
  }
}
