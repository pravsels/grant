import React from 'react'; 
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMath   from 'remark-math';
import rehypeKatex  from 'rehype-katex';

import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github.css';

export default function Bubble ({ role, content, attachments }) {
    const isUser = role === 'user'; 

    return (
        <div
            className={`bubble ${isUser ? 'user' : 'model'}`}
            onCopy={isUser ? undefined : e => e.preventDefault()}
        >
            {/* Render attachments first if any */}
            {attachments && attachments.length > 0 && (
                <div className="bubble-attachments" style={{ marginBottom: '0.5rem' }}>
                    {attachments.map((file, i) => (
                        <div 
                            key={i} 
                            style={{ 
                                background: 'rgba(0,0,0,0.05)', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                fontSize: '0.85em',
                                display: 'inline-block',
                                marginRight: '0.5rem',
                                marginBottom: '0.25rem'
                            }}
                        >
                            📎 {file.name}
                        </div>
                    ))}
                </div>
            )}

            {/* Only render markdown if there is content */}
            {content && (
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex, rehypeHighlight]}
                    components={{
                        // For display math (the $$…$$ blocks):
                        math: ({ value }) => (
                        <span className="math-display" dangerouslySetInnerHTML={{ __html: value }} />
                        ),
                        // For inline math ($…$):
                        inlineMath: ({ value }) => (
                        <code className="math-inline" dangerouslySetInnerHTML={{ __html: value }} />
                        ),

                        p: ({ node, children, ...props }) => {
                            // drop the <p> if a paragraph only contains one child 
                            const soloLine = 
                                node.children.length === 1 &&
                                ['inlineCode', 'inlineMath'].includes(node.children[0].type);

                            if (soloLine) {
                                return <>{children}</>;
                            }
                            return <p {...props}>{children}</p>;
                        },

                        code({ inline, children, ...props }) {
                            // style is handled by CSS based on <pre> or <code> context
                            return (
                                <code {...props}>
                                    {children}
                                </code>
                            );
                        }
                    }}
                >
                    {content}
                </ReactMarkdown>
            )}
        </div>
    );
}
