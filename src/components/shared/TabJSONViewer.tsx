import { CodeViewer } from "#components/common/CodeViewer";

interface TabJSONViewerProps {
  data: unknown;
  maxHeight?: number;
  className?: string;
}

/**
 * JSON viewer for tab contexts - wrapper around CodeViewer
 */
export function TabJSONViewer({
  data,
  maxHeight = 400,
  className = "",
}: TabJSONViewerProps) {
  return (
    <CodeViewer
      content={data}
      maxHeight={maxHeight}
      className={className}
      copyLabel="Copy JSON to clipboard"
      displayFormat="json"
    />
  );
}
