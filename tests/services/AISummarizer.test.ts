jest.mock('@actions/core', () => ({
    info: jest.fn(),
    warning: jest.fn(),
}));

import { AISummarizer } from '../../src/services/AISummarizer';

import * as core from '@actions/core';

describe('AISummarizer.generateSummary', () => {

    it('returns null if no api key provided', async () => {
        const ai = new AISummarizer();
        const result = await ai.generateSummary('1.0.0', { added: [], changed: [], fixed: [], breaking: [] });
        expect(result).toBeNull();
        expect(core.info).toHaveBeenCalledWith('No AI key provided; skipping AI summary.');
    });

    it('returns null if bucket empty even with key', async () => {
        const ai = new AISummarizer('key');
        const result = await ai.generateSummary('1.0.0', { added: [], changed: [], fixed: [], breaking: [] });
        expect(result).toBeNull();
        expect(core.info).toHaveBeenCalledWith('No items to summarize; skipping AI summary.');
    });

    it('returns null on failed fetch', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve('err') });
        const ai = new AISummarizer('key');
        const result = await ai.generateSummary('1.0.0', { added: ['- Added feature'], changed: [], fixed: [], breaking: [] });
        expect(result).toBeNull();
        expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('OpenAI API returned'));
    });

    it('returns content on success', async () => {
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: 'Bullet 1\nBullet 2' } }] }),
        });
        const ai = new AISummarizer('key');
        const result = await ai.generateSummary('1.0.0', { added: ['- Added feature'], changed: [], fixed: [], breaking: [] });
        expect(result).toBe('Bullet 1\nBullet 2');
    });
});
