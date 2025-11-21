/* eslint-disable @typescript-eslint/no-explicit-any, no-unused-vars */

interface JestGlobal {
    mock: (module: string, factory: () => any) => void;
    fn: () => any;
    resetModules: () => void;
}

declare const jest: JestGlobal;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
declare function expect(actual: any): any;
declare function require(name: string): any;

describe('GitHubService.ensureActiveReleasePr', () => {
    jest.resetModules();

    it('returns existing active release PR when found', async () => {
        jest.mock('@actions/core', () => ({ info: jest.fn() }));
        jest.mock('@actions/github', () => ({
            context: { repo: { owner: 'o', repo: 'r' } },
            getOctokit: () => ({
                graphql: jest.fn(async (query: string) => {
                    if (query.includes('ActiveReleasePr')) {
                        return { search: { nodes: [{ number: 99, headRefName: 'release/1.4.0' }] } };
                    }
                    throw new Error('Unexpected query');
                }),
            }),
        }));
        const { GitHubService } = require('../../src/services/GitHubService');

        const svc = new GitHubService({ owner: 'o', repo: 'r', baseBranch: 'main', sourceBranch: 'dev', releaseLabel: 'release', changelogPath: 'CHANGELOG.md', githubToken: 't', openaiApiKey: undefined });
        const info = await svc.ensureActiveReleasePr();
        expect(info).toEqual({ branch: 'release/1.4.0', version: '1.4.0', prNumber: 99 });
    });

    it('creates a new release PR when none active', async () => {
        jest.resetModules();
        jest.mock('@actions/core', () => ({ info: jest.fn() }));
        // Responses keyed by substring detection in query
        const responses: Record<string, unknown> = {
            'ActiveReleasePr': { search: { nodes: [] } },
            'RepoId': { repository: { id: 'REPO_ID' } },
            'LatestTag': { repository: { refs: { nodes: [{ name: 'v1.0.0', target: { committedDate: '2024-01-01T00:00:00Z' } }] } } },
            'SourceRef': { repository: { ref: { target: { oid: 'OID123' } } } },
            'CreateRef': { createRef: { ref: { id: 'REFID', name: 'release/1.0.1' } } },
            'BranchRef': { repository: { ref: { id: 'HEAD_REF_ID' } } },
            'CreateReleasePr': { createPullRequest: { pullRequest: { id: 'PRID', number: 101 } } },
            'LabelId': { repository: { label: null } },
            'CreateLabel': { createLabel: { label: { id: 'LABELID' } } },
            'AddReleaseLabel': { addLabelsToLabelable: { clientMutationId: null } },
        };
        const graphqlFn = jest.fn(async (query: string) => {
            for (const key of Object.keys(responses)) {
                if (query.includes(key)) return responses[key];
            }
            throw new Error('Unknown query');
        });
        jest.mock('@actions/github', () => ({
            context: { repo: { owner: 'o', repo: 'r' } },
            getOctokit: () => ({ graphql: graphqlFn }),
        }));
        const { GitHubService } = require('../../src/services/GitHubService');

        const svc = new GitHubService({ owner: 'o', repo: 'r', baseBranch: 'main', sourceBranch: 'dev', releaseLabel: 'release', changelogPath: 'CHANGELOG.md', githubToken: 't', openaiApiKey: undefined });
        const info = await svc.ensureActiveReleasePr();
        expect(info).toEqual({ branch: 'release/1.0.1', version: '1.0.1', prNumber: 101 });
        expect(graphqlFn).toHaveBeenCalled();
    });
});
