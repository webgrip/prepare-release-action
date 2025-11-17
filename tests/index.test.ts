jest.mock('@actions/core', () => ({
    info: jest.fn(),
    setFailed: jest.fn(),
}));

describe('src/index.ts', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    it('should run the application and log success', async () => {
        await jest.isolateModulesAsync(async () => {
            const { ApplicationService } = await import('../src/services/ApplicationService');
            const core = await import('@actions/core');

            const runSpy = jest
                .spyOn(ApplicationService.prototype, 'run')
                .mockResolvedValue(undefined);

            await import('../src/index');

            expect(runSpy).toHaveBeenCalled();
            expect(core.info).toHaveBeenCalledWith('Application ran successfully');
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
