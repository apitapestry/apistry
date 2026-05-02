import { describe, it, expect, vi } from 'vitest';
import { ExternalServiceRegistry } from '../../src/runtime/externalServiceRegistry.js';

describe('ExternalServiceRegistry', () => {
    it('loads services from config.externalSources and preserves baseUrl', () => {
        const reg = ExternalServiceRegistry.fromConfig({
            externalSources: {
                vinValidation: {
                    baseUrl: 'https://vpic.nhtsa.dot.gov/',
                    timeoutMs: 500
                }
            }
        });

        const svc = reg.getService('vinValidation');
        expect(svc).toBeTruthy();
        expect(svc.baseUrl).toBe('https://vpic.nhtsa.dot.gov/');
        expect(svc.timeoutMs).toBe(500);
        expect(svc.auth).toBeNull();
    });

    it('fails fast when baseUrl is missing', () => {
        expect(() =>
            ExternalServiceRegistry.fromConfig({
                externalSources: {
                    bad: { timeoutMs: 10 }
                }
            })
        ).toThrow(/baseUrl is required/i);
    });

    it('materializes bearer token from tokenEnv at startup', () => {
        vi.stubEnv('TEST_TOKEN', 'abc123');

        const reg = ExternalServiceRegistry.fromConfig({
            externalSources: {
                svc: {
                    baseUrl: 'https://example.com',
                    auth: {
                        type: 'bearer',
                        tokenEnv: 'TEST_TOKEN'
                    }
                }
            }
        });

        const svc = reg.getService('svc');
        expect(svc.auth).toEqual({ type: 'bearer', token: 'abc123' });

        vi.unstubAllEnvs();
    });
});
