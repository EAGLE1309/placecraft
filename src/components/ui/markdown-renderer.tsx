"use client";

import React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  // Simple markdown renderer for basic formatting with syntax highlighting
  const renderMarkdown = (text: string): React.ReactNode[] => {
    if (!text) return [];

    const elements: React.ReactNode[] = [];
    const lines = text.split('\n');
    let currentParagraph: string[] = [];
    let inCodeBlock = false;
    let codeBlockLanguage = '';
    let codeBlockContent: string[] = [];

    const flushParagraph = () => {
      if (currentParagraph.length > 0) {
        const paragraphText = currentParagraph.join(' ').trim();
        if (paragraphText) {
          elements.push(
            <p key={`p-${elements.length}`} className="mb-4">
              {renderInlineMarkdown(paragraphText)}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    const flushCodeBlock = () => {
      if (codeBlockContent.length > 0) {
        const code = codeBlockContent.join('\n');
        elements.push(
          <div key={`code-${elements.length}`} className="my-4 rounded-lg overflow-hidden">
            <SyntaxHighlighter
              language={codeBlockLanguage || 'text'}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '0.875rem',
                lineHeight: '1.5',
              }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        );
        codeBlockContent = [];
        codeBlockLanguage = '';
      }
    };

    lines.forEach((line) => {
      // Check for code block start/end
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          flushCodeBlock();
          inCodeBlock = false;
        } else {
          // Start code block
          flushParagraph();
          inCodeBlock = true;
          codeBlockLanguage = line.slice(3).trim() || 'text';
        }
        return;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        return;
      }

      // Handle headers
      if (line.startsWith('### ')) {
        flushParagraph();
        elements.push(
          <h3 key={`h3-${elements.length}`} className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">
            {renderInlineMarkdown(line.slice(4))}
          </h3>
        );
      } else if (line.startsWith('## ')) {
        flushParagraph();
        elements.push(
          <h2 key={`h2-${elements.length}`} className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-gray-100">
            {renderInlineMarkdown(line.slice(3))}
          </h2>
        );
      } else if (line.startsWith('# ')) {
        flushParagraph();
        elements.push(
          <h1 key={`h1-${elements.length}`} className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">
            {renderInlineMarkdown(line.slice(2))}
          </h1>
        );
      } else if (line.trim() === '') {
        flushParagraph();
      } else if (line.match(/^\d+\. /) || line.match(/^[-*] /)) {
        // Handle lists
        flushParagraph();
        const isOrdered = line.match(/^\d+\. /);
        const listContent = line.replace(/^(\d+\.|[-*])\s/, '');
        elements.push(
          <li key={`li-${elements.length}`} className={`ml-4 ${isOrdered ? 'list-decimal' : 'list-disc'} mb-1`}>
            {renderInlineMarkdown(listContent)}
          </li>
        );
      } else {
        currentParagraph.push(line);
      }
    });

    // Flush any remaining content
    flushParagraph();
    flushCodeBlock();

    return elements;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Process inline markdown elements
    let processed = text;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Bold text (**text**)
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before bold
      if (match.index > lastIndex) {
        parts.push(<React.Fragment key={`text-before-bold-${match.index}`}>{text.slice(lastIndex, match.index)}</React.Fragment>);
      }
      parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    // Italic text (*text*)
    if (lastIndex < text.length) {
      processed = text.slice(lastIndex);
      const italicRegex = /\*(.*?)\*/g;
      let italicMatch;
      let italicLastIndex = 0;

      while ((italicMatch = italicRegex.exec(processed)) !== null) {
        if (italicMatch.index > italicLastIndex) {
          parts.push(<React.Fragment key={`text-before-italic-${italicMatch.index}`}>{processed.slice(italicLastIndex, italicMatch.index)}</React.Fragment>);
        }
        parts.push(<em key={`italic-${italicMatch.index}`}>{italicMatch[1]}</em>);
        italicLastIndex = italicMatch.index + italicMatch[0].length;
      }

      if (italicLastIndex < processed.length) {
        parts.push(<React.Fragment key={`text-after-italic-${processed.length}`}>{processed.slice(italicLastIndex)}</React.Fragment>);
      }
    } else {
      if (lastIndex < text.length) {
        parts.push(<React.Fragment key={`text-after-bold-${text.length}`}>{text.slice(lastIndex)}</React.Fragment>);
      }
    }

    // Process inline code and links in remaining text parts
    return parts.map((part, index) => {
      if (typeof part !== 'string') return <React.Fragment key={`part-${index}`}>{part}</React.Fragment>;

      // Inline code
      if (part.includes('`')) {
        const codeParts: React.ReactNode[] = [];
        let codeLastIndex = 0;
        const codeRegex = /`([^`]+)`/g;
        let codeMatch;

        while ((codeMatch = codeRegex.exec(part)) !== null) {
          if (codeMatch.index > codeLastIndex) {
            codeParts.push(<React.Fragment key={`text-before-code-${index}-${codeMatch.index}`}>{part.slice(codeLastIndex, codeMatch.index)}</React.Fragment>);
          }
          codeParts.push(
            <code key={`code-${index}-${codeMatch.index}`} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-gray-800 dark:text-gray-200">
              {codeMatch[1]}
            </code>
          );
          codeLastIndex = codeMatch.index + codeMatch[0].length;
        }

        if (codeLastIndex < part.length) {
          codeParts.push(<React.Fragment key={`text-after-code-${index}`}>{part.slice(codeLastIndex)}</React.Fragment>);
        }

        return <>{codeParts.map((codePart, codeIndex) => (
          <React.Fragment key={`code-part-${codeIndex}`}>
            {codePart}
          </React.Fragment>
        ))}</>;
      }

      // Links
      if (part.includes('[') && part.includes('](')) {
        const linkParts: React.ReactNode[] = [];
        let linkLastIndex = 0;
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let linkMatch;

        while ((linkMatch = linkRegex.exec(part)) !== null) {
          if (linkMatch.index > linkLastIndex) {
            linkParts.push(<React.Fragment key={`text-before-link-${index}-${linkMatch.index}`}>{part.slice(linkLastIndex, linkMatch.index)}</React.Fragment>);
          }
          linkParts.push(
            <a
              key={`link-${index}-${linkMatch.index}`}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {linkMatch[1]}
            </a>
          );
          linkLastIndex = linkMatch.index + linkMatch[0].length;
        }

        if (linkLastIndex < part.length) {
          linkParts.push(<React.Fragment key={`text-after-link-${index}`}>{part.slice(linkLastIndex)}</React.Fragment>);
        }

        return <>{linkParts.map((linkPart, linkIndex) => (
          <React.Fragment key={`link-part-${linkIndex}`}>
            {linkPart}
          </React.Fragment>
        ))}</>;
      }

      return <React.Fragment key={`string-part-${index}`}>{part}</React.Fragment>;
    });
  };

  return (
    <div className={`prose prose-sm max-w-none dark:prose-invert ${className}`}>
      {renderMarkdown(content)}
    </div>
  );
}
