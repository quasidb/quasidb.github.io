// script.js
const scoresCtx = document.getElementById('scoresChart').getContext('2d');
const volCtx = document.getElementById('volChart').getContext('2d');

new Chart(scoresCtx, {
  type: 'bar',
  data: {
    labels: ['EUR/USD', 'GBP/USD', 'USD/JPY'],
    datasets: [{
      label: 'QDB Score',
      data: [75, 60, 90],
      backgroundColor: ['#3498db', '#9b59b6', '#e74c3c']
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: true }
    }
  }
});

new Chart(volCtx, {
  type: 'line',
  data: {
    labels: ['9AM', '12PM', '3PM', '6PM'],
    datasets: [{
      label: 'Volatility Delta',
      data: [0.3, 0.7, -0.2, 0.5],
      borderColor: '#2ecc71',
      fill: false
    }]
  },
  options: {
    responsive: true,
    scales: {
      y: { beginAtZero: false }
    }
  }
});
