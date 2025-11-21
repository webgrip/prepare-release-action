/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-vars */

interface JestGlobal {
    mock: (module: string, factory: () => any) => void;
    fn: (implementation?: (...args: any[]) => any) => any;
}

interface BufferConstructor {
    from: (data: string) => Buffer;
}

declare const jest: JestGlobal;
declare const Buffer: BufferConstructor;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect(actual: any): any;

jest.mock('@actions/core', () => ({
    info: jest.fn(),
    warning: jest.fn(),
}));

// Mock fs promises
jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn().mockRejectedValue(new Error('missing')),
        writeFile: jest.fn().mockResolvedValue(undefined),
    },
}));

// Mock exec to simulate git status showing changes
jest.mock('@actions/exec', () => ({
    exec: jest.fn(async (cmd: string, args: string[], opts?: any) => {
        if (args[0] === 'status') {
            opts?.listeners?.stdout?.(Buffer.from(' M CHANGELOG.md\n'));
        }
        return 0;
    }),
}));

// Stub AISummarizer
jest.mock('../../src/services/AISummarizer', () => ({
    AISummarizer: class { generateSummary = jest.fn().mockResolvedValue('Generated summary'); },
}));

import { ChangelogService } from '../../src/services/ChangelogService';
import * as fs from 'fs';

const mockContext = {
    owner: 'test',
    repo: 'test',
    baseBranch: 'main',
    sourceBranch: 'development',
    releaseLabel: 'release',
    changelogPath: 'CHANGELOG.md',
    githubToken: 'token',
    openaiApiKey: 'test-key',
};

const mockPrs = [
    { id: '1', number: 1, title: 'Feature A', body: '## Changelog\n- [added] New feature capability', labels: [], mergedAt: '2024-01-01T00:00:00Z' },
];

describe('ChangelogService', () => {
    it('updates changelog with version, AI summary, and commits', async () => {
        // Create a spy on the mocked class
        const generateSummarySpy = jest.fn().mockResolvedValue('Generated summary');
        const MockedAISummarizer = jest.fn().mockImplementation(() => ({
            generateSummary: generateSummarySpy,
        }));

        const ai = new MockedAISummarizer();
        const changelog = new ChangelogService(mockContext, ai as any);

        await changelog.updateChangelogForVersion('1.0.0', 'release/1.0.0', mockPrs);

        expect(fs.promises.writeFile).toHaveBeenCalledTimes(1);
        const content: string = (fs.promises.writeFile as any).mock.calls[0][1];
        expect(content).toContain('## [1.0.0]');
        expect(generateSummarySpy).toHaveBeenCalled();
        expect(content).toContain('### AI Summary');
        expect(content).toContain('Generated summary');
    });
});
