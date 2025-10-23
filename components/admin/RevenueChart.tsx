
import React from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { BarChartIcon, LineChartIcon } from '../Icons';

type ChartType = 'bar' | 'line';
type FilterType = 'day' | 'week' | 'month';

interface RevenueChartProps {
    data: { name: string, revenue: number }[];
    chartType: ChartType;
    setChartType: (type: ChartType) => void;
    filter: FilterType;
    setFilter: (filter: FilterType) => void;
    totalRevenue: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                <p className="label font-semibold">{`${label}`}</p>
                <p className="intro text-indigo-500 dark:text-indigo-400">{`Revenue: $${payload[0].value.toFixed(2)}`}</p>
            </div>
        );
    }
    return null;
};

const RevenueChart = ({ data, chartType, setChartType, filter, setFilter, totalRevenue }: RevenueChartProps) => {

    const renderChart = () => {
        const ChartComponent = chartType === 'bar' ? BarChart : LineChart;
        const ChartElement = chartType === 'bar' ? Bar : Line;
        const axisColor = document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b';
        const gridColor = document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0';

        return (
             <ResponsiveContainer width="100%" height={300}>
                <ChartComponent data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="name" stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke={axisColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}/>
                    <ChartElement 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke="#818cf8" 
                        fill="#818cf8" 
                        dot={chartType === 'line' ? { r: 4 } : false}
                        activeDot={chartType === 'line' ? { r: 6 } : undefined}
                    />
                </ChartComponent>
            </ResponsiveContainer>
        )
    }

    const FilterButton = ({ value, label }: { value: FilterType, label: string }) => (
        <button
            onClick={() => setFilter(value)}
            className={`px-3 py-1 rounded-md text-sm font-semibold transition-colors ${filter === value ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
        >
            {label}
        </button>
    );
    
    const TypeButton = ({ value, icon }: { value: ChartType, icon: React.ReactNode }) => (
        <button
            onClick={() => setChartType(value)}
            className={`p-2 rounded-md transition-colors ${chartType === value ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300'}`}
        >
            {icon}
        </button>
    );

    return (
        <div className="group relative flex flex-col rounded-xl bg-white dark:bg-slate-950 p-4 shadow-lg dark:shadow-2xl">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-10 dark:opacity-20 blur-sm"></div>
            <div className="absolute inset-px rounded-[11px] bg-white dark:bg-slate-950"></div>
            <div className="relative">
                <div className="flex flex-wrap justify-between items-center mb-4 gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenue Overview</h3>
                        <p className="text-2xl font-bold text-indigo-500 dark:text-indigo-400">${totalRevenue.toFixed(2)} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">total</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
                            <FilterButton value="day" label="Day" />
                            <FilterButton value="week" label="Week" />
                            <FilterButton value="month" label="Month" />
                        </div>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-900 p-1 rounded-lg">
                            <TypeButton value="bar" icon={<BarChartIcon />} />
                            <TypeButton value="line" icon={<LineChartIcon />} />
                        </div>
                    </div>
                </div>

                {data.length > 0 ? (
                    renderChart()
                ) : (
                    <div className="h-[300px] flex items-center justify-center">
                        <p className="text-gray-400 dark:text-slate-500">No revenue data for the selected period.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RevenueChart;