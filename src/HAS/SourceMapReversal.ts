 
/* eslint-disable no-useless-escape */
import { SourceMapConsumer } from 'source-map-js';

export class SourceMapReversal {
    static async decode(trace: string): Promise<string> {
        if (!trace || (!trace.includes('.min.js') && !trace.includes('node_modules'))) return trace;
        console.warn('[SAERE] Minified trace detected. Applying SourceMap heuristics.');
        
        const lines = trace.split('\n');
        const decodedLines = await Promise.all(lines.map(async line => {
            // Extract URL, line, column
            const match = line.match(/(https?:\/\/[^\s]+):(\d+):(\d+)/);
            if (match) {
                const [fullUrl, url, lineNum, colNum] = match;
                try {
                    // Try to fetch the source map
                    const mapUrl = url + '.map';
                    const response = await fetch(mapUrl);
                    if (response.ok) {
                        const rawSourceMap = await response.json();
                        // source-map-js is synchronous
                        const consumer = new SourceMapConsumer(rawSourceMap);
                        const pos = consumer.originalPositionFor({
                            line: parseInt(lineNum, 10),
                            column: parseInt(colNum, 10)
                        });
                        
                        if (pos && pos.source) {
                            return line.replace(fullUrl, `${pos.source}:${pos.line}:${pos.column}`);
                        }
                    }
                } catch (_e) {
                    // Fallback to regex below
                }
            }
            if (line.includes('node_modules')) {
                return line.replace(/node_modules\/([^\/]+)\/.*\.js:(\d+):(\d+)/, '$1 (external) at line $2');
            }
            return line;
        }));
        return decodedLines.join('\n');
    }
}
