import { CodeViewer } from "#components/common/CodeViewer";

interface TabASCIIViewerProps {
  content: string;
  maxHeight?: number;
  className?: string;
}

/**
 * ASCII content viewer for tabbed contexts - wrapper around CodeViewer
 */
export function TabASCIIViewer({
  content,
  maxHeight = 400,
  className = "",
}: TabASCIIViewerProps) {
  return (
    <CodeViewer
      content={content}
      maxHeight={maxHeight}
      className={className}
      copyLabel="Copy ASCII diagram to clipboard"
      displayFormat="text"
    />
  );
}
