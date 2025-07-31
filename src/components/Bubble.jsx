
import React from 'react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMath   from 'remark-math';
import rehypeKatex  from 'rehype-katex';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

export default function Bubble ({ role, content }) {
    const isUser = role === 'user'; 

    return (
        <div
            onCopy={isUser ? undefined : e => e.preventDefault()}
            style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                background: isUser ? '#dcf8c6' : '#fff',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                margin: '0.25rem 0',
                maxWidth: '70%',
                userSelect: isUser ? 'text' : 'none',
                fontSize: '16px',
                lineHeight: 1.55
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeHighlight]}
                components={{
                    // For display math (the $$…$$ blocks):
                    math: ({ value }) => (
                    <span style={{ background: 'rgba(255,249,196,0.5)' }}
                            dangerouslySetInnerHTML={{ __html: value }} />
                    ),
                    // For inline math ($…$):
                    inlineMath: ({ value }) => (
                    <code style={{ background: '#fff7c2', padding: '0 2px', borderRadius: '2px' }}
                            dangerouslySetInnerHTML={{ __html: value }} />
                    ),

                    p: ({ node, children, ...props }) => {
                        // drop the <p> if a paragraph only contains one child 
                        const soloLine = 
                            node.children.length === 1 &&
                            ['inlineCode', 'inlineMath'].includes(node.children[0].type);

                        if (soloLine) {
                            return <>{children}</>;
                        }
                        return <p style={{ margin: '0.5rem 0' }} {...props}>{children}</p>;
                    },

                    code({ inline, children, ...props }) {
                    
                        const raw = (children[0] || '').toString();
                        
                        // is it a block that only contains one line ? 
                        const lonelyFence = !inline && !raw.includes('\n');

                        if (inline || lonelyFence) {
                            // Single-backtick code: `inline`
                            return (
                            <code
                                style={{
                                background: '#eee',
                                padding: '0.2rem 0.4rem',
                                borderRadius: 3,
                                fontFamily: 'monospace',
                                fontSize: '0.9em'
                                }}
                                {...props}
                            >
                                {children}
                            </code>
                            );
                        }
                        // Triple-backtick fenced code block
                        return (
                            <pre
                                style={{
                                    background: '#FFFBEA',
                                    padding: '1rem',
                                    borderRadius: 6,
                                    overflowX: 'auto',
                                    fontSize: '0.85rem',
                                    lineHeight: 1.4
                                }}
                            >
                                <code 
                                    style={{
                                        background: '#FFFBEA',
                                        padding: '0.2rem 0.4rem',
                                        borderRadius: 3,
                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                                        fontSize: '0.9em'
                                    }}
                                    {...props} 
                                >
                                    {children}
                                </code>
                            </pre>
                        );
                    }
                }}
            >
                {content}
            </ReactMarkdown>

        </div>
    );
}
