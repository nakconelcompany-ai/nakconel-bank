import { describe, expect, it } from 'vitest';
import { isFlutterwaveSandboxReady } from './flutterwave';

describe('Flutterwave sandbox configuration', () => {
  it('is disabled when credentials are absent', () => {
    expect(isFlutterwaveSandboxReady({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('requires explicit sandbox mode, enable flag, and a test secret', () => {
    expect(isFlutterwaveSandboxReady({
      NODE_ENV: 'test',
      FLW_MODE: 'sandbox',
      FLW_TRANSFERS_ENABLED: 'true',
      FLW_SECRET_KEY: 'FLWSECK_TEST-example',
    } as NodeJS.ProcessEnv)).toBe(true);
  });

  it('never enables payouts in production', () => {
    expect(isFlutterwaveSandboxReady({
      NODE_ENV: 'production',
      FLW_MODE: 'sandbox',
      FLW_TRANSFERS_ENABLED: 'true',
      FLW_SECRET_KEY: 'FLWSECK_TEST-example',
    } as NodeJS.ProcessEnv)).toBe(false);
  });

  it('rejects live keys even if sandbox mode is selected', () => {
    expect(isFlutterwaveSandboxReady({
      NODE_ENV: 'test',
      FLW_MODE: 'sandbox',
      FLW_TRANSFERS_ENABLED: 'true',
      FLW_SECRET_KEY: 'FLWSECK_LIVE-example',
    } as NodeJS.ProcessEnv)).toBe(false);
  });
});
