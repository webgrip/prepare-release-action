export interface PrepareReleaseResult {
    version: string;
    branch: string;
    prNumber: number;
}

export interface ReleaseContext {
    owner: string;
    repo: string;
    baseBranch: string;
    sourceBranch: string;
    releaseLabel: string;
    changelogPath: string;
    githubToken: string;
    openaiApiKey?: string;
}

export interface ReleasePrInfo {
    branch: string;
    version: string;
    prNumber: number;
}

export interface PrInfo {
    id: string;
    number: number;
    title: string;
    body: string;
    labels: string[];
    mergedAt: string;
}
