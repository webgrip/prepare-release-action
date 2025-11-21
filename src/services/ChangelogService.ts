import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { promises as fs } from 'fs';
import * as path from 'path';

import { AISummarizer } from './AISummarizer';
import { PrInfo, ReleaseContext } from '../types';

type ChangeType = 'added' | 'changed' | 'fixed' | 'breaking';

export class ChangelogService {
    private ctx: ReleaseContext;
    private ai: AISummarizer;

    constructor(ctx: ReleaseContext, ai: AISummarizer) {
        this.ctx = ctx;
        this.ai = ai;
    }

    public async updateChangelogForVersion(
        version: string,
        releaseBranch: string,
        prs: PrInfo[],
    ): Promise<void> {
        const changelogAbsPath = path.resolve(this.ctx.changelogPath);
        let existing = '';

        try {
            existing = await fs.readFile(changelogAbsPath, 'utf8');
        } catch {
            core.info(`No existing ${this.ctx.changelogPath}; will create a new one.`);
        }

        const section = await this.buildSection(version, prs);
        const updated = this.insertOrReplaceVersionSection(existing, version, section);

        await fs.writeFile(changelogAbsPath, updated, 'utf8');

        // Commit & push if changed
        let status = '';
        await exec.exec('git', ['status', '--porcelain', this.ctx.changelogPath], {
            listeners: {
                stdout: (data: Buffer) => {
                    status += data.toString();
                },
            },
        });

        if (!status.trim()) {
            core.info('No CHANGELOG changes to commit.');
            return;
        }

        await exec.exec('git', ['config', 'user.name', 'github-actions[bot]']);
        await exec.exec('git', ['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
        await exec.exec('git', ['add', this.ctx.changelogPath]);
        await exec.exec('git', ['commit', '-m', `chore(release): update changelog for v${version}`]);
        await exec.exec('git', ['push', 'origin', releaseBranch]);
    }

    private async buildSection(version: string, prs: PrInfo[]): Promise<string> {
        const bucket: Record<ChangeType, string[]> = {
            added: [],
            changed: [],
            fixed: [],
            breaking: [],
        };

        for (const pr of prs) {
            const lines = pr.body.split(/\r?\n/);
            const changelogLines: string[] = [];
            let inSection = false;

            for (const line of lines) {
                if (line.trim().toLowerCase().startsWith('## changelog')) {
                    inSection = true;
                    continue;
                }
                if (inSection && line.startsWith('## ')) {
                    break;
                }
                if (inSection) changelogLines.push(line);
            }

            const sourceLines = changelogLines.length > 0
                ? changelogLines
                : [`- [changed] ${pr.title}`];

            for (const raw of sourceLines) {
                const line = raw.trim();
                if (!line) continue;

                // "- [type] text"
                const match = line.match(/^-+\s*\[(\w+)\]\s*(.*)$/);
                let type: ChangeType = 'changed';
                let text = line.replace(/^-\s*/, '');

                if (match) {
                    const tag = match[1].toLowerCase();
                    const content = match[2].trim();
                    text = content || text;

                    if (tag === 'added' || tag === 'changed' || tag === 'fixed' || tag === 'breaking') {
                        type = tag;
                    }
                }

                bucket[type].push(`- ${text} (#${pr.number})`);
            }
        }

        const today = new Date().toISOString().slice(0, 10);
        const parts: string[] = [];

        parts.push(`## [${version}] - ${today}\n\n`);

        const summary = await this.ai.generateSummary(version, bucket);
        if (summary) {
            parts.push('### AI Summary\n\n');
            parts.push(summary.trim());
            parts.push('\n\n');
        }

        const order: ChangeType[] = ['added', 'changed', 'fixed', 'breaking'];

        for (const type of order) {
            const items = bucket[type];
            if (!items.length) continue;

            const heading =
                type === 'breaking'
                    ? 'Breaking changes'
                    : type.charAt(0).toUpperCase() + type.slice(1);

            parts.push(`### ${heading}\n`);
            parts.push(items.join('\n'));
            parts.push('\n\n');
        }

        return parts.join('');
    }

    private insertOrReplaceVersionSection(
        existing: string,
        version: string,
        section: string,
    ): string {
        // Defensive: ensure undefined values cannot trigger trim errors
        existing = existing || '';
        section = section || '';
        if (!existing.trim()) {
            return `${section.trim()}\n`;
        }

        const escapedVersion = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(
            `^## \\[${escapedVersion}\\].*?(?=^## \\[|\\Z)`,
            'ms',
        );

        if (pattern.test(existing)) {
            return existing.replace(pattern, section.trim() + '\n\n');
        }

        const trimmed = existing.trimStart();
        return `${section.trim()}\n\n${trimmed}\n`;
    }
}
