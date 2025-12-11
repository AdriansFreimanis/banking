"use client";
import {Chart as ChartJS, ArcElement, Tooltip, Legend} from "chart.js"
import { Doughnut } from "react-chartjs-2"

ChartJS.register(ArcElement, Tooltip, Legend);


const DoughnutChart = ({accounts}: DoughnutChartProps) => {
    // Build chart data dynamically from accounts
    const palette = [
        '#0747b6',
        '#2265d8',
        '#2f91fa',
        '#0b6e4f',
        '#16a34a',
        '#f59e0b',
        '#f97316',
        '#ef4444',
        '#8b5cf6',
        '#06b6d4',
    ];

    const labels = (accounts && accounts.length > 0)
        ? accounts.map((a: any, i: number) => (a.name ? `${a.name}` : `Account ${i + 1}`))
        : ['No accounts'];

    const dataValues = (accounts && accounts.length > 0)
        ? accounts.map((a: any) => Number(a.currentBalance || 0))
        : [1];

    const backgroundColor = (accounts && accounts.length > 0)
        ? accounts.map((_, i: number) => palette[i % palette.length])
        : ['#e5e7eb'];

    const data = {
        datasets: [
            {
                label: 'Banks',
                data: dataValues,
                backgroundColor,
            },
        ],
        labels,
    };

    return (
        <Doughnut
            data={data}
            options={{
                cutout: '60%',
                plugins: {
                    legend: { display: false },
                },
            }}
        />
    );
};

export default DoughnutChart