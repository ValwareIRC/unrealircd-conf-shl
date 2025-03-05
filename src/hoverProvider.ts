import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import axios, { AxiosError } from 'axios';

const URL = 'https://www.unrealircd.org/docs/';

export class UnrealIRCdHoverProvider implements vscode.HoverProvider {
    provideHover(
        document: vscode.TextDocument,
        position: vscode.Position,
        token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.Hover> {
        return (async () => {
            const lineText = document.lineAt(position).text;
            const wordRange = document.getWordRangeAtPosition(position, /^\w+/);
            const word = document.getText(wordRange);

            // Check if the word is at the beginning of the line
            if (word && lineText.startsWith(word)) {
                const docs = await showDocsForWord(word);
                if (docs) {
                    const hoverText = new vscode.MarkdownString(docs);
                    return new vscode.Hover(hoverText);
                }
            }

            return null;
        })();
    }
}

const cache: { [key: string]: { content: string, timestamp: number } } = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // Cache duration in milliseconds (e.g., 24 hours)

async function showDocsForWord(word: string): Promise<string | undefined> {
    const w = word.charAt(0).toUpperCase() + word.slice(1);
    const blockUrl = `${URL+w}_block`;
    const directiveUrl = `${URL+w}_directive`;

    const headers = {
        'User-Agent': 'UnrealVSCE/1.1.0'
    };

    const now = Date.now();
    if (cache[word] && (now - cache[word].timestamp < CACHE_DURATION)) {
        return cache[word].content;
    }

    try {
        let response = await axios.get(blockUrl, { headers });
        let htmlContent = response.data;
        let content = extractContent(htmlContent);

        if (!content) {
            response = await axios.get(directiveUrl, { headers });
            htmlContent = response.data;
            content = extractContent(htmlContent);
        }

        if (content) {
            cache[word] = { content, timestamp: now };
        }

        return content;
    } catch (error) {
        if (isAxiosError(error) && error.response && error.response.status === 403) {
            try {
                const response = await axios.get(directiveUrl, { headers });
                const htmlContent = response.data;
                const content = extractContent(htmlContent);
                if (content) {
                    cache[word] = { content, timestamp: now };
                }
                return content;
            } catch (directiveError) {
                console.error(`Error fetching directive documentation for ${word}:`, directiveError);
            }
        } else {
            console.error(`Error fetching documentation for ${word}:`, error);
        }
        return;
    }
}

function isAxiosError(error: any): error is AxiosError {
    return error.isAxiosError === true;
}

function extractContent(htmlContent: string): string | undefined {
    const $ = cheerio.load(htmlContent);
    $('#toc').remove(); // Remove the element with id 'toc'
    let title = $('.mw-page-title-main').html();
    $('.mw-editsection').remove(); // Remove all elements with class 'mw-editsection'
    $('.noprint').remove(); // Remove all elements with class 'mw-editsection'
    
    let content = $('#mw-content-text').html();

    if (content) {
        content = replaceHtmlLinksWithMarkdown(content);
        content = content.replace(/<[^>]+>/g, ''); // Remove HTML tags
        content = normalizeText(decodeHtml(content));
        let s = title?.replace(/\s/g, '_');
        return `## ${title}\n***\n👉 [View in Official Documentation 📖](${URL+s})\n\n${content}`;
    } else {
        return;
    }
}

function normalizeText(text: string): string {
    return text
        .replace(/\n{4,}/g, '\n\n\n');
}

function replaceHtmlLinksWithMarkdown(html: string): string {
    html = html.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, (match, url, text) => {
        if (url.startsWith('#')) {
            return text;
        }
        if (url.startsWith('https://www.unrealircd.org')) {
            return `[${text}](${url})`;
        }
        return `[${text}](https://www.unrealircd.org${url})`;
    });

    html = html.replace(/<code+[^>]*>(.*?)<\/code>/gi, (match, code) => {
        return `\`${code}\``;
    });

    html = html.replace(/<pre+[^>]*>(.*?)<\/pre>/gis, (match, pre) => {
        return `\`\`\`\n${pre}\n\`\`\``;
    });

    html = html.replace(/<span+[^>]*>(.*?)<\/span>/gis, (match, span) => {
        return `\n\n### ${span}\n`;
    });

    html = html.replace(/<p>(.*?)<\/p>/gis, (match, p) => {
        return `${p}\n\n`;
    });

    html = html.replace(/<li>(.*?)<\/li>/gis, (match, li) => {
        return `- ${li}\n\n`;
    });

    html = html.replace(/<h\d>(.*?)<\/h\d>/gis, (match, h2) => {
        console.log(h2+'\n\n\n');
        return `<strong>${h2}<strong>\n\n\n`;
    });

    console.log(html);
    return html;
}

function decodeHtml(input: string): string {
    const entities = {
        '&lt;': '<',
        '&gt;': '>',
        '&amp;': '&',
        '&quot;': '"',
        '&#39;': "'",
        '&#x2F;': '/'
    };
    return input.replace(/&lt;|&gt;|&amp;|&quot;|&#39;|&#x2F;/g, match => entities[match as keyof typeof entities]);
}