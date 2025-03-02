import { useCallback, useState } from 'react';
import './App.css';
import { StockTradeData } from './models/StockTradeData';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import Treemap from 'react-d3-treemap';
import 'react-d3-treemap/dist/react.d3.treemap.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

type Aggregation = "Daily" | "Weekly" | "Monthly" | "Quarterly";
type Chart = "BarChart" | "TreeMap";

const fetchTrades = async (startTimestamp: string, minTradeSize: number): Promise<StockTradeData[]> => {
  try {
    // Construct the URL with query parameters
    const url = new URL('http://localhost:5072/api/trades');
    url.searchParams.append('startTimestamp', startTimestamp);
    url.searchParams.append('minQuoteSize', minTradeSize.toString());

    // Fetch data from the API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Parse and return the JSON data
    const data: StockTradeData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching trades:', error);
    return []; // Return an empty array in case of error
  }
};

function App() {
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDay()).toISOString().split('T')[0]);
  const [minSize, setMinSize] = useState(0);
  const [aggregation, setAggregation] = useState<Aggregation>('Daily');
  const [chart, setChart] = useState<Chart>('BarChart');
  const [trades, setTrades] = useState<StockTradeData[]>([]);

  const handleFetchTrades = useCallback(async () => {
    const fetchedTrades = await fetchTrades(new Date(startDate).toISOString(), minSize);
    setTrades(fetchedTrades);
  }, [startDate, minSize]);

  const aggregateData = (data: StockTradeData[], period: Aggregation) => {
    const groupedData: { [key: string]: StockTradeData[] } = {};
    data.forEach(trade => {
      const date = new Date(trade.timestamp);
      let key: string;
      console.log (date);

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

  // Bar Chart Data
  const barChartData = {
    labels: Object.keys(aggregatedData),
    datasets: [
      {
        label: 'Total Volume',
        data: Object.values(aggregatedData).map(trades => trades.reduce((sum, trade) => sum + trade.tradeSize, 0)),
        backgroundColor: 'rgba(75,192,192,0.2)',
        borderColor: 'rgba(75,192,192,1)',
        borderWidth: 1,
      },
    ],
  };

  // Tree Map Data
  const treeMapData = {
    name: 'Total Value',
    children: Object.entries(aggregatedData).map(([key, trades]) => ({
      name: key,
      value: trades.reduce((sum, trade) => sum + trade.tradeSize * trade.price, 0),
    })),
  };

  return (
    <>
      <div className='main-container'>
        <div className='menu-container'>
          <div className='input-group'>
            <label>Start Date</label>
            <input type="date" id="start" name="trip-start" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className='input-group'>
            <label>Min Size</label>
            <input type="number" id="minSize" name="trip-start" value={minSize} onChange={(e) => setMinSize(Number(e.target.value))} />
          </div>
          <div className='input-group'>
            <label>Aggregation</label>
            <select name="aggregation" id="aggregation" value={aggregation} onChange={(e) => setAggregation(e.target.value as Aggregation)}>
              <option value="Daily">Daily (1 Day)</option>
              <option value="Weekly">Weekly (7 Days)</option>
              <option value="Monthly">Monthly (30 Days)</option>
              <option value="Quarterly">Quarterly (91 Days)</option>
            </select>
          </div>
          <div className='input-group'>
            <label>Chart</label>
            <select name="chart" id="chart" value={chart} onChange={(e) => setChart(e.target.value as Chart)}>
              <option value="BarChart">Bar Chart</option>
              <option value="TreeMap">Tree Map</option>
            </select>
          </div>
          <button onClick={handleFetchTrades}>Go</button>
        </div>
        <div>
          <div className='chart-container'>
            {chart === 'BarChart' && <Bar data={barChartData} />}
            {chart === 'TreeMap' && <Treemap data={treeMapData} />}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;