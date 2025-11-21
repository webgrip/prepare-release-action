import * as core from '@actions/core';
import { ApplicationService } from './services/ApplicationService';

export async function main(): Promise<void> {
    try {
        const app = new ApplicationService();
        const result = await app.run();

        if (result) {
            core.setOutput('version', result.version);
            core.setOutput('branch', result.branch);
            core.setOutput('pr-number', result.prNumber.toString());
        }

        core.info('prepare-release-action completed successfully');
    } catch (error) {
        core.setFailed(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

main();
