/** Error codes shared with the frontend (see src/services/ai/claudeProvider.ts). */
export type AIErrorCode =
  | 'not_configured'
  | 'invalid_key'
  | 'forbidden'
  | 'model_not_found'
  | 'rate_limited'
  | 'overloaded'
  | 'unreachable'
  | 'refused'
  | 'incomplete'
  | 'invalid_output'
  | 'bad_request'
  | 'upstream_error'
  | 'invalid_input';

export class AIError extends Error {
  constructor(
    public readonly code: AIErrorCode,
    public readonly status: number,
    message: string,
    public readonly hint?: string,
  ) {
    super(message);
    this.name = 'AIError';
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, hint: this.hint } };
  }

  static notConfigured() {
    return new AIError(
      'not_configured',
      503,
      'Claude isn’t connected: ANTHROPIC_API_KEY is not set on the server.',
      'Add your key to the .env file in the project root, restart the server, then try again. See README → AI setup.',
    );
  }
  static invalidKey() {
    return new AIError('invalid_key', 502, 'Anthropic rejected the API key.', 'Check ANTHROPIC_API_KEY in your .env file, then restart the server.');
  }
  static forbidden() {
    return new AIError('forbidden', 502, 'This API key doesn’t have access to the configured model.', 'Check your Anthropic Console workspace permissions or set ANTHROPIC_MODEL.');
  }
  static modelNotFound(model: string) {
    return new AIError('model_not_found', 502, `The model “${model}” wasn’t found.`, 'Check ANTHROPIC_MODEL in your .env file.');
  }
  static rateLimited() {
    return new AIError('rate_limited', 429, 'Claude is receiving too many requests right now.', 'Wait a minute, then try again.');
  }
  static overloaded() {
    return new AIError('overloaded', 503, 'Claude is temporarily overloaded.', 'Try again in a moment.');
  }
  static unreachable() {
    return new AIError('unreachable', 502, 'The server couldn’t reach the Anthropic API.', 'Check the server’s internet connection, then try again.');
  }
  static refused() {
    return new AIError('refused', 422, 'Claude declined to generate this request.', 'Rephrase the inputs and try again.');
  }
  static incomplete() {
    return new AIError('incomplete', 502, 'The response was cut off before it finished.', 'Try again, or shorten the inputs.');
  }
  static invalidOutput() {
    return new AIError('invalid_output', 502, 'Claude returned a response the app couldn’t read.', 'Try again.');
  }
  static badRequest() {
    return new AIError('bad_request', 502, 'The request to Claude was rejected.', 'Check the server logs for details.');
  }
  static upstream() {
    return new AIError('upstream_error', 502, 'Something went wrong while talking to Claude.', 'Try again in a moment.');
  }
  static invalidInput(message: string) {
    return new AIError('invalid_input', 400, message, 'Fill in the required fields and try again.');
  }
}
