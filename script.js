const dropdown = document.getElementById('pairDropdown');
const apiURL = 'https://script.google.com/macros/s/AKfycbzBd3FHbK_LSHZUh5WeE1hwVVKivWNw4Qai-Ai2ONAwP7vks_v37_f2ca_YrK8WE4chYg/exec';

// Fetch currency pairs and populate dropdown
fetch(apiURL)
  .then(response => response.json())
  .then(pairs => {
    dropdown.innerHTML = ''; // Clear "Loading..."
    pairs.forEach(pair => {
      const option = document.createElement('option');
      option.value = pair;
      option.textContent = pair;
      dropdown.appendChild(option);
    });
  })
  .catch(error => {
    console.error('Dropdown fetch error:', error);
    dropdown.innerHTML = '<option>Error loading pairs</option>';
  });
