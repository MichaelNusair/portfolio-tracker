import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Transaction, ASSET_DISPLAY_NAMES } from "@/types/portfolio";

interface TransactionsTableProps {
  transactions: Transaction[];
  onDelete?: (id: string) => void;
}

export const TransactionsTable = ({
  transactions,
  onDelete,
}: TransactionsTableProps) => {
  return (
    <Card className="bg-card border-border/50">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50">
            <TableHead className="text-muted-foreground">Date</TableHead>
            <TableHead className="text-muted-foreground">Asset</TableHead>
            <TableHead className="text-muted-foreground">Type</TableHead>
            <TableHead className="text-muted-foreground">Quantity</TableHead>
            <TableHead className="text-muted-foreground">Price (ILS)</TableHead>
            <TableHead className="text-muted-foreground">Total (ILS)</TableHead>
            {onDelete && (
              <TableHead className="text-muted-foreground">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="border-border/50">
              <TableCell className="text-foreground">
                {new Date(transaction.date).toLocaleDateString()}
              </TableCell>
              <TableCell className="text-foreground">
                {ASSET_DISPLAY_NAMES[transaction.asset]}
              </TableCell>
              <TableCell>
                <Badge
                  variant={transaction.type === "buy" ? "default" : "secondary"}
                >
                  {transaction.type.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell className="text-foreground">
                {transaction.quantity.toFixed(4)}
              </TableCell>
              <TableCell className="text-foreground">
                ₪{transaction.totalILS.toLocaleString()}
              </TableCell>
              <TableCell className="text-foreground">
                ₪
                {(transaction.totalILS * transaction.quantity).toLocaleString()}
              </TableCell>
              {onDelete && (
                <TableCell>
                  <button
                    onClick={() => onDelete(transaction.id)}
                    className="text-destructive hover:text-destructive/80 transition-colors"
                  >
                    Delete
                  </button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
