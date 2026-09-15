import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Markdown } from "@/components/ui/markdown";
import { splitVariableTokens } from "@/modules/api-docs/lib/postman";

function ValueWithTokens({ value }: { value: string }) {
  return (
    <>
      {splitVariableTokens(value).map((part, i) =>
        part.isVariable ? (
          <span key={i} className="font-semibold text-primary">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}

export function KvTable({
  ariaLabel,
  rows,
}: {
  ariaLabel: string;
  rows: { key: string; value: string; description?: string }[];
}) {
  const hasDescription = rows.some((row) => row.description);
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <Table aria-label={ariaLabel}>
        <TableHeader>
          <TableRow>
            <TableHead className="w-48">Key</TableHead>
            <TableHead>Value</TableHead>
            {hasDescription && <TableHead>Description</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.key}-${i}`}>
              <TableCell className="font-mono text-xs font-medium">{row.key}</TableCell>
              <TableCell className="font-mono text-xs break-all">
                <ValueWithTokens value={row.value} />
              </TableCell>
              {hasDescription && (
                <TableCell>
                  {row.description ? (
                    <Markdown className="text-xs">{row.description}</Markdown>
                  ) : null}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
