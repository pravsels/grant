
import React from 'react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';

export default function Bubble ({ role, content }) {
    const isUser = role === 'user'; 

    return (
        <div
            onCopy={e => e.preventDefault()}
            style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                background: isUser ? '#dcf8c6' : '#fff',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                margin: '0.25rem 0',
                maxWidth: '70%',
                userSelect: 'none',
                fontSize: '16px',
                lineHeight: 1.55
            }}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                    // Override how paragraphs render
                    p: (props) => (
                    // props.children is the paragraph text
                    <p style={{ margin: '0.5rem 0' }} {...props} />
                    ),

                    // Override how code renders
                    code({ inline, children, ...props }) {
                    if (inline) {
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
