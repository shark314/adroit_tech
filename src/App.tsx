import { useCallback, useState, useRef, useEffect } from 'react';
import { StockTradeData } from './models/StockTradeData';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Treemap from 'react-d3-treemap';
import 'react-d3-treemap/dist/react.d3.treemap.css';
import { Container, TextField, Select, MenuItem, Button, FormControl, InputLabel, Box, Typography, Grid } from '@mui/material';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Aggregation = "Daily" | "Weekly" | "Monthly" | "Quarterly";
type Chart = "BarChart" | "TreeMap";

const fetchTrades = async (startTimestamp: string, minTradeSize: number): Promise<StockTradeData[]> => {
  try {
    const url = new URL('http://localhost:5072/api/trades');
    url.searchParams.append('startTimestamp', startTimestamp);
    url.searchParams.append('minQuoteSize', minTradeSize.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data: StockTradeData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trades:', error);
    return [];
  }
};

function App() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDay()).toISOString().split('T')[0]);
  const [minSize, setMinSize] = useState(0);
  const [aggregation, setAggregation] = useState<Aggregation>('Daily');
  const [chart, setChart] = useState<Chart>('BarChart');
  const [trades, setTrades] = useState<StockTradeData[]>([]);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const handleFetchTrades = useCallback(async () => {
    const fetchedTrades = await fetchTrades(new Date(startDate).toISOString(), minSize);
    setTrades(fetchedTrades);
  }, [startDate, minSize]);

  const aggregateData = (data: StockTradeData[], period: Aggregation) => {
    const groupedData: { [key: string]: StockTradeData[] } = {};
    data.forEach(trade => {
      const date = new Date(trade.timestamp);
      let key: string;

      switch (period) {
        case 'Daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'Weekly':
          key = new Date(date.setDate(date.getDate() - date.getDay())).toISOString().split('T')[0];
          break;
        case 'Monthly':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'Quarterly':
          key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
          break;
        default:
          key = date.toISOString().split('T')[0];
      }

      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      groupedData[key].push(trade);
    });

    return groupedData;
  };

  const aggregatedData = aggregateData(trades, aggregation);

  const barChartData = {
    labels: Object.keys(aggregatedData),
    datasets: [
      {
        label: 'Total Volume',
        data: Object.values(aggregatedData).map(trades => trades.reduce((sum, trade) => sum + trade.tradeSize, 0)),
        backgroundColor: 'rgba(75,192,192,0.2)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
        borderRadius: 2,
      },
    ],
  };

  const treeMapData = {
    name: 'Total Value',
    children: Object.entries(aggregatedData).map(([key, trades]) => ({
      name: key,
      value: trades.reduce((sum, trade) => sum + trade.tradeSize * trade.price, 0),
    })),
  };

  const colorScale = (value: number) => {
    // Custom color scale for Treemap
    const colors = ['#ff7f50', '#87cefa', '#da70d6', '#32cd32', '#6495ed'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle window resize for Treemap
  useEffect(() => {
    const handleResize = () => {
      if (chart === 'TreeMap' && chartContainerRef.current) {
        // Force re-render or update dimensions for Treemap
        // You may need to pass the container's dimensions to the Treemap component
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [chart]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Stock Trade Data Visualization
        </Typography>
        <Grid container spacing={2}>
          {/* Start Date */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <TextField
                label="Start Date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                fullWidth
              />
            </FormControl>
          </Grid>

          {/* Min Size */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <TextField
                label="Min Size"
                type="number"
                value={minSize}
                onChange={(e) => setMinSize(Number(e.target.value))}
                fullWidth
              />
            </FormControl>
          </Grid>

          {/* Aggregation */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="aggregation-label">Aggregation</InputLabel>
              <Select
                labelId="aggregation-label"
                id="aggregation"
                value={aggregation}
                label="Aggregation"
                onChange={(e) => setAggregation(e.target.value as Aggregation)}
                fullWidth
              >
                <MenuItem value="Daily">Daily (1 Day)</MenuItem>
                <MenuItem value="Weekly">Weekly (7 Days)</MenuItem>
                <MenuItem value="Monthly">Monthly (30 Days)</MenuItem>
                <MenuItem value="Quarterly">Quarterly (91 Days)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Chart Type */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel id="chart-label">Chart</InputLabel>
              <Select
                labelId="chart-label"
                id="chart"
                value={chart}
                label="Chart"
                onChange={(e) => setChart(e.target.value as Chart)}
                fullWidth
              >
                <MenuItem value="BarChart">Bar Chart</MenuItem>
                <MenuItem value="TreeMap">Tree Map</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Go Button */}
          <Grid item xs={12}>
            <Button variant="contained" onClick={handleFetchTrades} fullWidth>
              Go
            </Button>
          </Grid>
        </Grid>

        {/* Chart Container */}
        <Box sx={{ mt: 4, height: '400px' }} ref={chartContainerRef}>
          {chart === 'BarChart' && (
            <Bar
              data={barChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
              }}
            />
          )}
          {chart === 'TreeMap' && (
            <Treemap
              data={treeMapData}
              width={chartContainerRef.current?.clientWidth || 800}
              height={400}
              colorScale={colorScale} // Custom color scale
            />
          )}
        </Box>
      </Box>
    </Container>
  );
}

export default App;