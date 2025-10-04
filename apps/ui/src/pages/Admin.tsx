import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { TransactionsTable } from '@/components/TransactionsTable';
import { AddTransactionForm } from '@/components/AddTransactionForm';
import { CSVImport } from '@/components/CSVImport';
import { Transaction } from '@/types/portfolio';
import { getTransactions, addTransaction } from '@/lib/portfolioStorage';
import { ArrowLeft, Wallet, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const loadTransactions = useCallback(async () => {
    setTransactions(await getTransactions());
    toast({
      title: 'Transactions Loaded',
      description: 'Your transactions have been loaded successfully.',
    });
  }, [toast]);

  const handleAddTransaction = useCallback(
    async (txData: Omit<Transaction, 'id'>) => {
      const transaction = await addTransaction(txData);
      if (transaction) {
        setTransactions((prev) => [...prev, transaction]);
      }
      loadTransactions();
      toast({
        title: 'Transaction Added',
        description: 'Your transaction has been recorded successfully.',
      });
    },
    [loadTransactions, toast]
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  function handleImportCSV(csvText: string) {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-primary shadow-glow">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Admin Panel
              </h1>
              <p className="text-muted-foreground text-sm">
                Manage your transactions
              </p>
            </div>
          </div>
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="border-border/50 hover:bg-secondary/50 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <AddTransactionForm
              onAdd={async (txData) => {
                await handleAddTransaction({
                  ...txData,
                  userId: '123',
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
            />
            <CSVImport
              onImport={async (csvText) => {
                await handleImportCSV(csvText);
              }}
            />
          </div>

          <div className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  All Transactions
                </h3>
                <p className="text-sm text-muted-foreground">
                  {transactions.length} total transactions
                </p>
              </div>
              {transactions.length > 0 && (
                <Button
                  onClick={() => {
                    toast({
                      title: 'Talk to mich',
                      description: 'you cant do that',
                    });
                  }}
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear All
                </Button>
              )}
            </div>
            {transactions.length > 0 ? (
              <TransactionsTable
                transactions={transactions}
                onDelete={() => {
                  toast({
                    title: 'Talk to mich',
                    description: 'you cant do that',
                  });
                }}
              />
            ) : (
              <div className="rounded-lg border border-border/50 bg-card p-12 text-center">
                <p className="text-muted-foreground">
                  No transactions yet. Add your first transaction above.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;
