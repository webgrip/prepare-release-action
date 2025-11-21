import * as core from '@actions/core';

type ChangeType = 'added' | 'changed' | 'fixed' | 'breaking';

export class AISummarizer {
    private apiKey?: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || undefined;
    }

    public async generateSummary(
        version: string,
        bucket: Record<ChangeType, string[]>,
    ): Promise<string | null> {
        if (!this.apiKey) {
            core.info('No AI key provided; skipping AI summary.');
            return null;
        }

        const sections: string[] = [];
        for (const [type, items] of Object.entries(bucket) as [ChangeType, string[]][]) {
            if (!items.length) continue;
            sections.push(`${type.toUpperCase()}:\n${items.join('\n')}`);
        }

        if (!sections.length) {
            core.info('No items to summarize; skipping AI summary.');
            return null;
        }

        const prompt = [
            `You are generating release notes for version ${version}.`,
            'Summarize the changes at a high level in 3–7 bullet points in markdown.',
            'Focus on user-visible behaviour and important fixes.',
            '',
            'Changes:',
            sections.join('\n\n'),
        ].join('\n');

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'gpt-4.1-mini',
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                }),
            } as any);

            if (!response.ok) {
                const text = await response.text();
                core.warning(`OpenAI API returned ${response.status}: ${text}`);
                return null;
            }

            const json = (await response.json()) as any;
            const content = json?.choices?.[0]?.message?.content;
            if (typeof content !== 'string') {
                core.warning('Unexpected OpenAI response structure');
                return null;
            }

            return content;
        } catch (error) {
            core.warning(`Failed to generate AI summary: ${String(error)}`);
            return null;
        }
    }
}
