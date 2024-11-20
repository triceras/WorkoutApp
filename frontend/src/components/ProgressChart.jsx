// src/components/ProgressChart.jsx

import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';

ChartJS.register(
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement,
  Tooltip,
  Legend,
  Title
);

function ProgressChart({ progressData }) {
  const data = {
    labels: progressData.dates,
    datasets: [
      {
        label: 'Weight Lifted (kg)',
        data: progressData.weights,
        fill: false,
        backgroundColor: '#3f51b5',
        borderColor: '#3f51b5',
        tension: 0.1, // Optional: smoothes the line
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      title: {
        display: true,
        text: 'Progress Over Time',
      },
      legend: {
        display: true,
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Weight (kg)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Date',
        },
      },
    },
  };

  return <Line data={data} options={options} />;
}

export default ProgressChart;
