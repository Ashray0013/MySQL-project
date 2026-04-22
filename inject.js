const fs = require('fs');
const files = ['dashboard.html', 'index.html', 'profile.html', 'club.html', 'visit-profile.html', 'login.html', 'signup.html'];

const scriptContent = `
  <script>
    // JWT Fetch Interceptor
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const token = localStorage.getItem('token');
      if (token) {
        if (args.length === 1) {
          args.push({ headers: {} });
        } else {
          args[1] = args[1] || {};
          args[1].headers = args[1].headers || {};
        }
        
        // Handle headers object vs Headers instance
        if (args[1].headers instanceof Headers) {
          args[1].headers.append('Authorization', 'Bearer ' + token);
        } else {
          args[1].headers['Authorization'] = 'Bearer ' + token;
        }
      }
      return originalFetch(...args);
    };
  </script>
</head>`;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('JWT Fetch Interceptor')) {
        content = content.replace('</head>', scriptContent);
        fs.writeFileSync(file, content);
        console.log('Updated ' + file);
    }
});
