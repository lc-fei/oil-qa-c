import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

interface AnswerRendererProps {
  content: string;
  className?: string;
  compact?: boolean;
}

const styles = {
  root: {
    color: '#1f2937',
    fontSize: 14,
    lineHeight: 1.85,
  } satisfies CSSProperties,
  paragraph: {
    margin: '0 0 12px',
  } satisfies CSSProperties,
  heading: {
    margin: '18px 0 10px',
    fontWeight: 700,
    color: '#111827',
  } satisfies CSSProperties,
  list: {
    margin: '0 0 12px',
    paddingInlineStart: 20,
  } satisfies CSSProperties,
  quote: {
    margin: '0 0 12px',
    padding: '8px 12px',
    borderLeft: '3px solid #10a37f',
    background: '#f3fbf8',
    color: '#374151',
  } satisfies CSSProperties,
  inlineCode: {
    padding: '2px 6px',
    borderRadius: 6,
    background: '#f3f4f6',
    color: '#0f172a',
    fontSize: 13,
  } satisfies CSSProperties,
  codeBlock: {
    margin: '0 0 12px',
    padding: 12,
    borderRadius: 12,
    overflowX: 'auto',
    background: '#111827',
    color: '#f9fafb',
    fontSize: 13,
    lineHeight: 1.7,
  } satisfies CSSProperties,
  table: {
    width: '100%',
    marginBottom: 12,
    borderCollapse: 'collapse',
  } satisfies CSSProperties,
  cell: {
    padding: '8px 10px',
    border: '1px solid #e5e7eb',
    verticalAlign: 'top',
  } satisfies CSSProperties,
  link: {
    color: '#0f8a66',
    textDecoration: 'underline',
  } satisfies CSSProperties,
} as const;

function mergeStyle(base: CSSProperties, compact: boolean, override?: CSSProperties): CSSProperties {
  // 收藏页摘要需要更紧凑的排版，因此统一在渲染层做轻量压缩。
  return compact
    ? {
        ...base,
        marginTop: 0,
        marginBottom: typeof base.marginBottom === 'number' ? Math.min(base.marginBottom, 8) : 8,
        ...override,
      }
    : {
        ...base,
        ...override,
      };
}

export function AnswerRenderer({ content, className, compact = false }: AnswerRendererProps) {
  // 模型返回的是不完全可信的富文本字符串，这里只按 Markdown 子集渲染并做 HTML 白名单过滤。
  return (
    <div className={className} style={styles.root}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          p({ children }: ComponentPropsWithoutRef<'p'>) {
            return <p style={mergeStyle(styles.paragraph, compact)}>{children}</p>;
          },
          h1({ children }: ComponentPropsWithoutRef<'h1'>) {
            return <h1 style={mergeStyle(styles.heading, compact, { fontSize: 24 })}>{children}</h1>;
          },
          h2({ children }: ComponentPropsWithoutRef<'h2'>) {
            return <h2 style={mergeStyle(styles.heading, compact, { fontSize: 20 })}>{children}</h2>;
          },
          h3({ children }: ComponentPropsWithoutRef<'h3'>) {
            return <h3 style={mergeStyle(styles.heading, compact, { fontSize: 17 })}>{children}</h3>;
          },
          ul({ children }: ComponentPropsWithoutRef<'ul'>) {
            return <ul style={mergeStyle(styles.list, compact)}>{children}</ul>;
          },
          ol({ children }: ComponentPropsWithoutRef<'ol'>) {
            return <ol style={mergeStyle(styles.list, compact)}>{children}</ol>;
          },
          blockquote({ children }: ComponentPropsWithoutRef<'blockquote'>) {
            return <blockquote style={mergeStyle(styles.quote, compact)}>{children}</blockquote>;
          },
          code({ children, className: codeClassName }: ComponentPropsWithoutRef<'code'>) {
            const isBlock = Boolean(codeClassName);

            if (isBlock) {
              return <code style={styles.codeBlock}>{children}</code>;
            }

            return <code style={styles.inlineCode}>{children}</code>;
          },
          pre({ children }: ComponentPropsWithoutRef<'pre'>) {
            return <pre style={mergeStyle(styles.codeBlock, compact)}>{children}</pre>;
          },
          table({ children }: ComponentPropsWithoutRef<'table'>) {
            return <table style={styles.table}>{children}</table>;
          },
          th({ children }: ComponentPropsWithoutRef<'th'>) {
            return (
              <th style={{ ...styles.cell, background: '#f9fafb', fontWeight: 700 }}>
                {children}
              </th>
            );
          },
          td({ children }: ComponentPropsWithoutRef<'td'>) {
            return <td style={styles.cell}>{children}</td>;
          },
          a({ children, href }: ComponentPropsWithoutRef<'a'>) {
            return (
              <a href={href} target="_blank" rel="noreferrer" style={styles.link}>
                {children}
              </a>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
