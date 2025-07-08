const dropdown = document.getElementById('pairDropdown');
const apiURL = 'https://script.google.com/macros/s/AKfycby3b221oTFgd43hdYtzrea1BHX19Bbh4C2bbtd2HUkOKAH4ytHHf0dG1uysVoRBUm5fAQ/exec';

// Fetch currency pairs and populate dropdown
fetch(apiURL)
  .then(res => res.json())
  .then(pairs => {
    dropdown.innerHTML = '';
    pairs.forEach(pair => {
      const option = document.createElement('option');
      option.value = pair;
      option.textContent = pair;
      dropdown.appendChild(option);
    });
  })
  .catch(err => {
    console.error('Dropdown fetch error:', err);
    dropdown.innerHTML = '<option>Error loading pairs</option>';
  });

// Fetch full row when a pair is selected
dropdown.addEventListener('change', () => {
  const selectedPair = dropdown.value;
  if (!selectedPair) return;

  fetch(`${apiURL}?pair=${encodeURIComponent(selectedPair)}`)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        document.getElementById('dataDisplay').innerHTML = `<p>Pair not found</p>`;
        return;
      }

      let html = `
        <h2>Metrics for ${selectedPair}</h2>
        <table>
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
      `;

      const ctx = document.getElementById('sentimentChart').getContext('2d');

if (window.pieChart) {
  window.pieChart.destroy(); // Clean previous chart
}

window.pieChart = new Chart(ctx, {
  type: 'pie',
  data: {
    labels: ['Short Volume', 'Long Volume'],
    datasets: [{
      data: [parseFloat(data.shortVolume), parseFloat(data.longVolume)],
      backgroundColor: ['#ff4d4d', '#4da6ff']
    }]
  },
  options: {
    responsive: false,
    plugins: {
      legend: { position: 'bottom' },
      title: {
        display: true,
        text: `Position Sentiment for ${selectedPair}`
      }
    }
  }
});


      const validKeys = Object.keys(data).slice(0, 12); // Columns A–L

      for (const key of validKeys) {
        const value = data[key];
        let valueClass = '';

        const num = parseFloat(value);
        if (!isNaN(num) && key.includes('%')) {
          valueClass = num >= 0 ? 'positive' : 'negative';
        }

        html += `
          <tr>
            <td>${key}</td>
            <td class="${valueClass}">${value}</td>
          </tr>
        `;
      }

      html += '</tbody></table>';
      document.getElementById('dataDisplay').innerHTML = html;
    })
    .catch(err => {
      console.error('Data fetch error:', err);
      document.getElementById('dataDisplay').innerHTML = `<p>Error fetching data for ${selectedPair}</p>`;
    });
});
