import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { AssetType } from "@/types/portfolio";

interface AddTransactionFormProps {
  onAdd: (transaction: {
    date: string;
    asset: AssetType;
    type: "buy" | "sell";
    quantity: number;
    totalILS: number;
  }) => void;
}

export const AddTransactionForm = ({ onAdd }: AddTransactionFormProps) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    asset: "BTC" as AssetType,
    type: "buy" as "buy" | "sell",
    quantity: "",
    totalILS: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      quantity: parseFloat(formData.quantity),
      totalILS: parseFloat(formData.totalILS),
    });
    setFormData({
      date: new Date().toISOString().split("T")[0],
      asset: "BTC",
      type: "buy",
      quantity: "",
      totalILS: "",
    });
  };

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
      <h3 className="text-lg font-bold mb-6 text-foreground">
        Add New Transaction
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="text-muted-foreground">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="bg-secondary border-border/50 text-foreground"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset" className="text-muted-foreground">
              Asset
            </Label>
            <Select
              value={formData.asset}
              onValueChange={(value: AssetType) =>
                setFormData({ ...formData, asset: value })
              }
            >
              <SelectTrigger className="bg-secondary border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                <SelectItem value="BTC">Bitcoin (BTC)</SelectItem>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="SPY">S&P 500 (SPY)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-muted-foreground">
              Type
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value: "buy" | "sell") =>
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger className="bg-secondary border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50">
                <SelectItem value="buy">Buy</SelectItem>
                <SelectItem value="sell">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-muted-foreground">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              step="0.0001"
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: e.target.value })
              }
              className="bg-secondary border-border/50 text-foreground"
              required
              placeholder="0.0000"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price" className="text-muted-foreground">
            Price (ILS)
          </Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.totalILS}
            onChange={(e) =>
              setFormData({ ...formData, totalILS: e.target.value })
            }
            className="bg-secondary border-border/50 text-foreground"
            required
            placeholder="0.00"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
        >
          Add Transaction
        </Button>
      </form>
    </Card>
  );
};
