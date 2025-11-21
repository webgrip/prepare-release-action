import * as core from '@actions/core';
import * as github from '@actions/github';

import {
    PrInfo,
    ReleaseContext,
    ReleasePrInfo,
} from '../types';

interface GraphQLClient {
    <T = any>(query: string, variables?: Record<string, unknown>): Promise<T>;
}

export class GitHubService {
    private graph: GraphQLClient;
    private ctx: ReleaseContext;
    private repoId?: string;

    constructor(ctx: ReleaseContext) {
        this.ctx = ctx;

        const octokit = github.getOctokit(ctx.githubToken);
        // Use octokit.graphql so auth/UA is handled
        this.graph = octokit.graphql as unknown as GraphQLClient;
    }

    public async ensureActiveReleasePr(): Promise<ReleasePrInfo> {
        const active = await this.findActiveReleasePr();

        if (active) {
            core.info(
                `Found active release PR #${active.prNumber} for branch ${active.branch} (version ${active.version})`,
            );
            return active;
        }

        core.info('No active release PR found, creating a new one…');
        return this.createNewReleasePr();
    }

    public async collectReleasePullRequests(version: string): Promise<PrInfo[]> {
        // Use last tag on baseBranch as "since"
        const lastTag = await this.getLatestTag();
        let since: string | null = null;

        if (lastTag) {
            since = lastTag.committedDate;
            core.info(`Collecting PRs merged into ${this.ctx.sourceBranch} since ${lastTag.name} (${since})`);
        } else {
            core.info(
                `No tags found. Collecting all merged PRs into ${this.ctx.sourceBranch} for first release.`,
            );
        }

        return this.listMergedPrsIntoSourceBranchSince(since);
    }

    // -----------------------
    // Helpers
    // -----------------------

    private async getRepoId(): Promise<string> {
        if (this.repoId) return this.repoId;

        const { owner, repo } = this.ctx;
        const query = `
          query RepoId($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              id
            }
          }
        `;

        const data = await this.graph<{
            repository: { id: string } | null;
        }>(query, { owner, name: repo });

        if (!data.repository) {
            throw new Error(`Repository ${owner}/${repo} not found`);
        }

        this.repoId = data.repository.id;
        return this.repoId;
    }

    private async findActiveReleasePr(): Promise<ReleasePrInfo | null> {
        const { owner, repo, baseBranch, releaseLabel } = this.ctx;

        const searchQuery = [
            `repo:${owner}/${repo}`,
            'is:pr',
            'is:open',
            `base:${baseBranch}`,
            `label:"${releaseLabel}"`,
        ].join(' ');

        const query = `
          query ActiveReleasePr($q: String!) {
            search(query: $q, type: ISSUE, first: 5) {
              nodes {
                ... on PullRequest {
                  id
                  number
                  headRefName
                }
              }
            }
          }
        `;

        const data = await this.graph<{
            search: { nodes: Array<{ number: number; headRefName: string }> };
        }>(query, { q: searchQuery });

        const pr = data.search.nodes[0];
        if (!pr) return null;

        const branch = pr.headRefName;
        const version = branch.replace(/^release\//, '');
        return {
            branch,
            version,
            prNumber: pr.number,
        };
    }

    private async getLatestTag(): Promise<{ name: string; committedDate: string } | null> {
        const { owner, repo } = this.ctx;

        const query = `
          query LatestTag($owner: String!, $name: String!) {
            repository(owner: $owner, name: $name) {
              refs(refPrefix: "refs/tags/", first: 1, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
                nodes {
                  name
                  target {
                    ... on Commit {
                      committedDate
                    }
                  }
                }
              }
            }
          }
        `;

        const data = await this.graph<{
            repository: {
                refs: {
                    nodes: Array<{
                        name: string;
                        target: { committedDate: string };
                    }>;
                };
            } | null;
        }>(query, { owner, name: repo });

        const nodes = data.repository?.refs.nodes ?? [];
        if (!nodes.length) return null;

        return {
            name: nodes[0].name,
            committedDate: nodes[0].target.committedDate,
        };
    }

    private async createNewReleasePr(): Promise<ReleasePrInfo> {
        const { owner, repo, baseBranch, sourceBranch, releaseLabel } = this.ctx;
        const repoId = await this.getRepoId();

        // Determine next version by bumping patch of latest tag
        const latestTag = await this.getLatestTag();
        const lastTagName = latestTag?.name ?? '0.0.0';
        core.info(`Last tag: ${lastTagName}`);

        const rawVersion = lastTagName.replace(/^v/, '');
        const [maj, min, pat] = rawVersion.split('.').map(n => parseInt(n || '0', 10));
        const nextVersion = `${maj}.${min}.${(pat || 0) + 1}`;
        const branchName = `release/${nextVersion}`;

        // Get source branch ref
        const refQuery = `
          query SourceRef($owner: String!, $name: String!, $ref: String!) {
            repository(owner: $owner, name: $name) {
              ref(qualifiedName: $ref) {
                target {
                  oid
                }
              }
            }
          }
        `;

        const refData = await this.graph<{
            repository: {
                ref: { target: { oid: string } } | null;
            } | null;
        }>(refQuery, {
            owner,
            name: repo,
            ref: `refs/heads/${sourceBranch}`,
        });

        const oid = refData.repository?.ref?.target.oid;
        if (!oid) {
            throw new Error(`Could not resolve ref for source branch ${sourceBranch}`);
        }

        // Create ref for release branch
        const createRefMutation = `
          mutation CreateRef($input: CreateRefInput!) {
            createRef(input: $input) {
              ref {
                id
                name
              }
            }
          }
        `;

        try {
            await this.graph(createRefMutation, {
                input: {
                    repositoryId: repoId,
                    name: `refs/heads/${branchName}`,
                    oid,
                },
            });
            core.info(`Created branch ${branchName} at ${oid}`);
        } catch (error: any) {
            const message = error?.message ?? '';
            if (message.includes('Reference already exists')) {
                core.info(`Branch ${branchName} already exists, continuing`);
            } else {
                throw error;
            }
        }

        // Get node id for branch ref
        const branchRefQuery = `
          query BranchRef($owner: String!, $name: String!, $ref: String!) {
            repository(owner: $owner, name: $name) {
              ref(qualifiedName: $ref) {
                id
              }
            }
          }
        `;

        const branchRefData = await this.graph<{
            repository: {
                ref: { id: string } | null;
            } | null;
        }>(branchRefQuery, {
            owner,
            name: repo,
            ref: `refs/heads/${branchName}`,
        });

        const headRefId = branchRefData.repository?.ref?.id;
        if (!headRefId) {
            throw new Error(`Could not resolve ref id for branch ${branchName}`);
        }

        // Create PR
        const createPrMutation = `
          mutation CreateReleasePr($input: CreatePullRequestInput!) {
            createPullRequest(input: $input) {
              pullRequest {
                id
                number
              }
            }
          }
        `;

        const prData = await this.graph<{
            createPullRequest: { pullRequest: { id: string; number: number } };
        }>(createPrMutation, {
            input: {
                repositoryId: repoId,
                baseRefName: baseBranch,
                headRefName: branchName,
                title: `Release ${nextVersion}`,
                body: `Automated release PR for version ${nextVersion}.`,
            },
        });

        const prId = prData.createPullRequest.pullRequest.id;
        const prNumber = prData.createPullRequest.pullRequest.number;
        core.info(`Created release PR #${prNumber}`);

        // Add label
        const labelId = await this.ensureLabelId(releaseLabel);

        const addLabelMutation = `
          mutation AddReleaseLabel($input: AddLabelsToLabelableInput!) {
            addLabelsToLabelable(input: $input) {
              clientMutationId
            }
          }
        `;

        await this.graph(addLabelMutation, {
            input: {
                labelIds: [labelId],
                labelableId: prId,
            },
        });

        return {
            branch: branchName,
            version: nextVersion,
            prNumber,
        };
    }

    private async ensureLabelId(name: string): Promise<string> {
        const { owner, repo } = this.ctx;

        const query = `
          query LabelId($owner: String!, $name: String!, $label: String!) {
            repository(owner: $owner, name: $name) {
              label(name: $label) {
                id
              }
            }
          }
        `;

        const data = await this.graph<{
            repository: { label: { id: string } | null } | null;
        }>(query, { owner, name: repo, label: name });

        const existing = data.repository?.label;
        if (existing?.id) {
            return existing.id;
        }

        // Create label if missing
        const mutation = `
          mutation CreateLabel($input: CreateLabelInput!) {
            createLabel(input: $input) {
              label {
                id
              }
            }
          }
        `;

        const result = await this.graph<{
            createLabel: { label: { id: string } };
        }>(mutation, {
            input: {
                repositoryId: await this.getRepoId(),
                name,
                color: '0366d6',
            },
        });

        return result.createLabel.label.id;
    }

    private async listMergedPrsIntoSourceBranchSince(since: string | null): Promise<PrInfo[]> {
        const { owner, repo, sourceBranch } = this.ctx;

        // Use search query to filter by base branch and merged date
        const parts = [
            `repo:${owner}/${repo}`,
            'is:pr',
            'is:merged',
            `base:${sourceBranch}`,
        ];

        if (since) {
            // merged:>YYYY-MM-DDTHH:MM:SSZ
            parts.push(`merged:>${since}`);
        }

        const searchQuery = parts.join(' ');

        const query = `
          query MergedPrs($q: String!, $after: String) {
            search(query: $q, type: ISSUE, first: 50, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                ... on PullRequest {
                  id
                  number
                  title
                  body
                  mergedAt
                  labels(first: 20) {
                    nodes {
                      name
                    }
                  }
                }
              }
            }
          }
        `;

        const results: PrInfo[] = [];
        let after: string | null = null;

        while (true) {
            const data = await this.graph<{
                search: {
                    pageInfo: { hasNextPage: boolean; endCursor: string | null };
                    nodes: Array<{
                        id: string;
                        number: number;
                        title: string;
                        body: string | null;
                        mergedAt: string;
                        labels: { nodes: Array<{ name: string | null }> };
                    }>;
                };
            }>(query, { q: searchQuery, after });

            for (const node of data.search.nodes) {
                results.push({
                    id: node.id,
                    number: node.number,
                    title: node.title,
                    body: node.body ?? '',
                    labels: node.labels.nodes
                        .map(l => l.name || '')
                        .filter(Boolean),
                    mergedAt: node.mergedAt,
                });
            }

            if (!data.search.pageInfo.hasNextPage) break;
            after = data.search.pageInfo.endCursor;
        }

        return results;
    }
}
