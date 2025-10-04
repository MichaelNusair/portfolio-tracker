import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { PortfolioValue } from "@/types/portfolio";

interface PortfolioChartProps {
  data: PortfolioValue[];
}

export const PortfolioChart = ({ data }: PortfolioChartProps) => {
  console.log("📈 PortfolioChart rendering with data:", data);
  console.log("📊 Data length:", data?.length);

  return (
    <Card className="p-6 bg-gradient-card border-border/50 shadow-card">
      <h3 className="text-lg font-bold mb-6 text-foreground">
        Portfolio Value Over Time
      </h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <defs>
              <linearGradient id="colorILS" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(263 70% 60%)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(263 70% 60%)"
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 25%)" />
            <XAxis
              dataKey="date"
              stroke="hsl(215 20% 65%)"
              style={{ fontSize: "12px" }}
            />
            <YAxis stroke="hsl(215 20% 65%)" style={{ fontSize: "12px" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(224 30% 12%)",
                border: "1px solid hsl(220 15% 25%)",
                borderRadius: "8px",
                color: "hsl(210 40% 98%)",
              }}
              formatter={(value: number) => `₪${value.toLocaleString()}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="totalILS"
              stroke="hsl(263 70% 60%)"
              strokeWidth={3}
              dot={{ fill: "hsl(263 70% 60%)", r: 4 }}
              activeDot={{ r: 6 }}
              name="Portfolio Value (ILS)"
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          <p>Loading historical data...</p>
        </div>
      )}
    </Card>
  );
};
