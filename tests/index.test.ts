/* global jest, describe, it, expect */
declare const jest: any;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => any): void;
declare function expect(actual: any): any;

jest.mock('@actions/core', () => ({
    info: jest.fn(),
    setFailed: jest.fn(),
    setOutput: jest.fn(),
}));

describe('src/index.ts', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('runs main, sets outputs when result returned, and logs success', async () => {
        await jest.isolateModulesAsync(async () => {
            const { ApplicationService } = await import('../src/services/ApplicationService');
            const core = await import('@actions/core');

            const runSpy = jest
                .spyOn(ApplicationService.prototype, 'run')
                .mockResolvedValue({ version: '1.2.3', branch: 'release/1.2.3', prNumber: 42 });

            await import('../src/index');

            expect(runSpy).toHaveBeenCalled();
            expect(core.setOutput).toHaveBeenCalledWith('version', '1.2.3');
            expect(core.setOutput).toHaveBeenCalledWith('branch', 'release/1.2.3');
            expect(core.setOutput).toHaveBeenCalledWith('pr-number', '42');
            expect(core.info).toHaveBeenCalledWith('prepare-release-action completed successfully');
        });
    });

    it('should setFailed if an error is thrown', async () => {
        await jest.isolateModulesAsync(async () => {
            const { ApplicationService } = await import('../src/services/ApplicationService');
            const core = await import('@actions/core');

            jest.spyOn(ApplicationService.prototype, 'run').mockRejectedValue(new Error('fail'));

            await import('../src/index');

            expect(core.setFailed).toHaveBeenCalledWith('Error: fail');
        });
    });
});
