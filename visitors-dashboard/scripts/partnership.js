
document.getElementById('sponsorForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const form = e.target;
  
    const response = await fetch('http://localhost:3000/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.value,
        brand: form.brand.value,
        email: form.email.value,
        message: form.message.value
      })
    });
  
    const result = await response.json();
    alert(result.message || 'Message sent!');
    form.reset();
  });