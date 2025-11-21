import * as core from '@actions/core';
import * as github from '@actions/github';
import * as exec from '@actions/exec';

import { AISummarizer } from './AISummarizer';
import { ChangelogService } from './ChangelogService';
import { GitHubService } from './GitHubService';
import {
    PrepareReleaseResult,
    ReleaseContext,
    ReleasePrInfo,
} from '../types';

export class ApplicationService {
    private injectedGh?: GitHubService;
    private injectedAi?: AISummarizer;
    private injectedChangelog?: ChangelogService;

    constructor(deps?: { gh?: GitHubService; ai?: AISummarizer; changelog?: ChangelogService }) {
        this.injectedGh = deps?.gh;
        this.injectedAi = deps?.ai;
        this.injectedChangelog = deps?.changelog;
    }

    public async run(): Promise<PrepareReleaseResult | undefined> {
        const ctx = this.buildContext();
        const gh = this.injectedGh ?? new GitHubService(ctx);
        const ai = this.injectedAi ?? new AISummarizer(ctx.openaiApiKey);
        const changelog = this.injectedChangelog ?? new ChangelogService(ctx, ai);

        core.startGroup('Ensure active release PR');
        const releaseInfo = await gh.ensureActiveReleasePr();
        core.endGroup();

        core.startGroup('Sync release branch with source branch');
        await this.syncReleaseBranch(ctx, releaseInfo.branch);
        core.endGroup();

        core.startGroup('Collect PRs for this release');
        const prs = await gh.collectReleasePullRequests(releaseInfo.version);
        core.info(`Using ${prs.length} PR(s) for changelog generation`);
        core.endGroup();

        core.startGroup('Generate changelog & commit');
        await changelog.updateChangelogForVersion(releaseInfo.version, releaseInfo.branch, prs);
        core.endGroup();

        return {
            version: releaseInfo.version,
            branch: releaseInfo.branch,
            prNumber: releaseInfo.prNumber,
        };
    }

    private buildContext(): ReleaseContext {
        const githubToken = core.getInput('github-token', { required: true });
        const baseBranch = core.getInput('base-branch') || 'main';
        const sourceBranch = core.getInput('source-branch') || 'development';
        const releaseLabel = core.getInput('release-label') || 'release';
        const changelogPath = core.getInput('changelog-path') || 'CHANGELOG.md';
        const openaiApiKey = core.getInput('openai-api-key') || undefined;

        const { owner, repo } = github.context.repo;

        return {
            owner,
            repo,
            baseBranch,
            sourceBranch,
            releaseLabel,
            changelogPath,
            githubToken,
            openaiApiKey,
        };
    }

    private async syncReleaseBranch(ctx: ReleaseContext, releaseBranch: string): Promise<void> {
        await exec.exec('git', ['fetch', 'origin', ctx.sourceBranch, releaseBranch]);
        await exec.exec('git', ['checkout', releaseBranch]);

        try {
            await exec.exec('git', ['merge', '--no-edit', `origin/${ctx.sourceBranch}`]);
        } catch (error) {
            // Don’t hard-fail; surfaces via conflicts in PR anyway
            core.warning(
                `Merge from origin/${ctx.sourceBranch} into ${releaseBranch} failed or had conflicts. Error: ${String(error)}`,
            );
        }
    }
}
