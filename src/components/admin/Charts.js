'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import styles from './Charts.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Daily Downloads Line Chart
 */
export function DailyDownloadsChart({ data = [], showViews = true, title, subtitle }) {
  if (!data || data.length === 0) {
    return <div className={styles.chartEmpty}>No activity data available</div>;
  }

  const labels = data.map((d) => d.label || d.date);
  const downloadCounts = data.map((d) => d.downloads || 0);
  const viewCounts = data.map((d) => d.views || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Downloads',
        data: downloadCounts,
        borderColor: '#D32F2F',
        backgroundColor: 'rgba(211, 47, 47, 0.12)',
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#D32F2F',
        pointBorderColor: '#FFFFFF',
        pointHoverRadius: 6,
        pointRadius: 3,
        borderWidth: 2.5,
      },
      ...(showViews
        ? [
            {
              label: 'Page Views',
              data: viewCounts,
              borderColor: '#1976D2',
              backgroundColor: 'rgba(25, 118, 210, 0.05)',
              fill: false,
              tension: 0.35,
              borderDash: [5, 5],
              pointBackgroundColor: '#1976D2',
              pointBorderColor: '#FFFFFF',
              pointHoverRadius: 5,
              pointRadius: 2.5,
              borderWidth: 1.8,
            },
          ]
        : []),
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          boxWidth: 12,
          font: { family: 'Inter', size: 12, weight: 500 },
          color: '#424242',
        },
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        titleFont: { family: 'Inter', size: 12, weight: 'bold' },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#757575', maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#757575', precision: 0 },
      },
    },
  };

  return (
    <div className={styles.chartCard}>
      {(title || subtitle) && (
        <div className={styles.chartHeader}>
          <div>
            {title && <h3 className={styles.chartTitle}>{title}</h3>}
            {subtitle && <p className={styles.chartSubtitle}>{subtitle}</p>}
          </div>
        </div>
      )}
      <div className={styles.chartContainer}>
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}

/**
 * Category Distribution Doughnut Chart
 */
export function CategoryDistributionChart({ categories = [], title = 'Category Distribution' }) {
  if (!categories || categories.length === 0) {
    return <div className={styles.chartEmpty}>No category data available</div>;
  }

  const validCategories = categories.filter((c) => (c._count?.apps || c.appCount || c.apps?.length || 0) > 0);
  const displayCats = validCategories.length > 0 ? validCategories : categories;

  const labels = displayCats.map((c) => c.name);
  const counts = displayCats.map((c) => c._count?.apps || c.appCount || c.apps?.length || 0);
  const backgroundColors = displayCats.map(
    (c) => c.color || '#D32F2F'
  );

  const chartData = {
    labels,
    datasets: [
      {
        data: counts,
        backgroundColor: backgroundColors,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        hoverOffset: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          font: { family: 'Inter', size: 12 },
          color: '#424242',
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: '#1A1A2E',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} apps`,
        },
      },
    },
  };

  return (
    <div className={styles.chartCard}>
      {title && (
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{title}</h3>
        </div>
      )}
      <div className={styles.chartContainer}>
        <Doughnut data={chartData} options={options} />
      </div>
    </div>
  );
}

/**
 * Top Performing Apps Bar Chart
 */
export function TopAppsBarChart({ apps = [], title = 'Top Apps by Downloads' }) {
  if (!apps || apps.length === 0) {
    return <div className={styles.chartEmpty}>No app download data available</div>;
  }

  const sortedApps = [...apps].sort((a, b) => (b.downloads || b.totalDownloads || 0) - (a.downloads || a.totalDownloads || 0)).slice(0, 5);
  const labels = sortedApps.map((a) => a.name);
  const downloads = sortedApps.map((a) => a.downloads || a.totalDownloads || 0);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Downloads',
        data: downloads,
        backgroundColor: [
          '#D32F2F',
          '#E53935',
          '#EF5350',
          '#E57373',
          '#EF9A9A',
        ],
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    indexAxis: 'y', // Horizontal bars
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1A1A2E',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
        ticks: { font: { family: 'Inter', size: 11 }, color: '#757575' },
      },
      y: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 12, weight: 500 }, color: '#212121' },
      },
    },
  };

  return (
    <div className={styles.chartCard}>
      {title && (
        <div className={styles.chartHeader}>
          <h3 className={styles.chartTitle}>{title}</h3>
        </div>
      )}
      <div className={styles.chartContainer}>
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}
