// File: /my-web-app/my-web-app/src/scripts/login.js

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        if (validateForm(username, password)) {
            // Handle login submission (e.g., send to server)
            console.log('Logging in with:', username);
            // Add your login logic here
        } else {
            alert('Please enter valid credentials.');
        }
    });

    function validateForm(username, password) {
        return username.trim() !== '' && password.trim() !== '';
    }
});