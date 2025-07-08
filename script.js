const dropdown = document.getElementById('pairDropdown');
const apiURL = 'https://script.google.com/macros/s/AKfycbxknCPoS01RsWuD6rqSF4l1udtEc56CFBrkU72Wf9hjOXyw16u4PT1hwxrKk6zMFdN8/exec';

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

      for (const [key, value] of Object.entries(data)) {
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
