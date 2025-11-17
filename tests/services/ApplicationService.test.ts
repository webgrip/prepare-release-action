import { ApplicationService } from '../../src/services/ApplicationService';

describe('ApplicationService', () => {
    let service: ApplicationService;

    beforeEach(() => {
        service = new ApplicationService();
    });

    it('should be instantiated', () => {
        expect(service).toBeInstanceOf(ApplicationService);
    });

    it('should have a run method', async () => {
        await expect(service.run()).resolves.toBeUndefined();
    });

});
