import * as core from '@actions/core';
import { ApplicationService } from './services/ApplicationService';

export async function main(): Promise<void> {
    try {
        const application = new ApplicationService();
        await application.run();
        core.info('Application ran successfully');
    } catch (error) {
        core.setFailed(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

main();
