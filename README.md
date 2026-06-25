# fullstack-test

Chatbot API built with NestJS for the Wizybot technical assessment. It uses OpenAI's Function Calling to handle customer enquiries — searching products from a CSV catalog and converting currencies in real time.

## What it does

The chatbot runs an agentic loop: on each user message it decides which tool to call (or none), executes it, and feeds the result back to the model until it produces a final response. Two tools available:

- `searchProducts` — scores products from `products_list.csv` by keyword match and returns the top 2
- `convertCurrencies` — hits the Open Exchange Rates API to convert between currencies

## Requirements

- Node.js 20+
- pnpm
- OpenAI API key
- Open Exchange Rates App ID (free tier is enough)

## Running locally

```bash
pnpm install
```

Copy the env file and fill in your keys:

```bash
cp .env.example .env
```

```
PORT=5000
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
OPEN_EXCHANGE_RATES_APP_ID=...
```

```bash
pnpm start:dev
```

Server runs at `http://localhost:5000`. Swagger at `http://localhost:5000/api`.

## API

`POST /chatbot/message`

```bash
curl -X POST http://localhost:5000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I am looking for a phone"}'
```

```json
{ "response": "Here are two phones you might like: ..." }
```

Some queries to try:

```bash
curl -X POST http://localhost:5000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "I am looking for a present for my dad"}'

curl -X POST http://localhost:5000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "How much does a watch costs?"}'

curl -X POST http://localhost:5000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What is the price of the watch in Euros"}'

curl -X POST http://localhost:5000/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "How many Canadian Dollars are 350 Euros"}'
```

## Security considerations

I spent some time on PortSwigger Web Security Academy and the OWASP Top 10 for LLM Applications, so I applied a few mitigations that are easy to miss in this kind of project:

**Prompt injection** — user input is sanitized before reaching the model: `@MaxLength(500)` to cut off long injection payloads, and a `@Transform` that strips invisible Unicode characters (zero-width spaces, directional marks) commonly used to hide instructions inside normal-looking text.

**Tool name whitelist** — the LLM decides which tool to call, and that decision is influenced by user input. An explicit `Set` rejects any tool name that wasn't intentionally exposed, so a successful injection can't trigger arbitrary code paths.

**Unsafe deserialization** — `JSON.parse` on LLM-generated arguments is wrapped in `try/catch`. If the model returns malformed JSON, the tool call is skipped and the loop continues instead of crashing.

**Rate limiting** — each request can trigger up to 2 OpenAI API calls. Without throttling, anyone can drain your quota fast. Global rate limit set to 10 req/min per IP via `@nestjs/throttler`.

## Project structure

```
src/
├── chatbot/
│   ├── dto/chat-message.dto.ts
│   ├── chatbot.controller.ts
│   └── chatbot.service.ts
├── products/
│   ├── interfaces/product.interface.ts
│   └── products.service.ts
├── currencies/
│   ├── interfaces/exchange-rates-response.interface.ts
│   └── currencies.service.ts
├── common/
│   └── filters/http-exception.filter.ts
└── main.ts
```

## Tests

```bash
pnpm test
```

## Author

Juan Camilo Palacio Alvarez
