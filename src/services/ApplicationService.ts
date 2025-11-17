export class ApplicationService {
    constructor() {}

    public async run(): Promise<void> {
        const result = await this.someAsyncOperation();

        return result;
    }

    private async someAsyncOperation(): Promise<void> {
        console.log('Waiting 1 second...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
    }
}
