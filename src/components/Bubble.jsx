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
            className={`bubble ${isUser ? 'user' : 'model'}`}
            onCopy={isUser ? undefined : e => e.preventDefault()}
        >
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

        </div>
    );
}
