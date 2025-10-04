import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CSVImportProps {
  onImport: (csvText: string) => void;
}

export const CSVImport = ({ onImport }: CSVImportProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        onImport(text);
        toast({
          title: "Import Successful",
          description: "Your transactions have been imported.",
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Please check your CSV format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
      <h3 className="text-lg font-bold mb-4 text-foreground">
        Import from CSV
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        CSV should have columns: date, asset, type, quantity, price (in ILS)
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        className="w-full border-border/50 hover:bg-secondary/50"
      >
        <Upload className="w-4 h-4 mr-2" />
        Choose CSV File
      </Button>
    </Card>
  );
};
