const apiURL = 'https://script.google.com/macros/s/AKfycbzBd3FHbK_LSHZUh5WeE1hwVVKivWNw4Qai-Ai2ONAwP7vks_v37_f2ca_YrK8WE4chYg/exec';

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
