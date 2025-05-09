// Display the logo for 3 seconds and then redirect to register.html
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        window.location.href = 'register.html';
    }, 3000);
});

// Handle form submission for registration and login
document.querySelector('form').addEventListener('submit', async function (event) {
    event.preventDefault();

    const formData = new FormData(this);
    const isRegisterForm = this.id === 'registerForm'; // Assuming the form has an ID

    if (isRegisterForm) {
        const user = {
            usn: formData.get('usn'),
            name: formData.get('name'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            password: formData.get('password'),
            bus_num: formData.get('bus_num'),
            address: formData.get('address')
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(user)
            });

            if (response.ok) {
                alert('Registration successful!');
                window.location.href = 'Log.html'; // Redirect to login page
            } else {
                const result = await response.json();
                alert('Registration failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error during registration:', error);
            alert('Something went wrong!');
        }
    } else {
        const credentials = {
            usn: formData.get('usn'), // Assuming "usn" is the field for login
            password: formData.get('password')
        };

        try {
            const response = await fetch('http://127.0.0.1:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(credentials)
            });

            if (response.ok) {
                alert('Login successful!');
                window.location.href = 'Dash.html'; // Redirect to dashboard
            } else {
                const result = await response.json();
                alert('Login failed: ' + result.message);
            }
        } catch (error) {
            console.error('Error during login:', error);
            alert('Something went wrong!');
        }
    }
});

// Load dashboard data
document.addEventListener('DOMContentLoaded', async () => {
    const usn = localStorage.getItem('usn'); // Get the logged-in user's USN

    try {
        // Fetch user details
        const userResponse = await fetch(`http://127.0.0.1:5000/api/user/${usn}`);
        const user = await userResponse.json();
        document.getElementById('userDetails').textContent = `Name: ${user.name}, Balance: Rs ${user.balance}`;

        // Fetch available buses
        const busResponse = await fetch('http://127.0.0.1:5000/api/buses');
        const buses = await busResponse.json();
        const busTable = document.getElementById('busTable');
        buses.forEach(bus => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bus.bus_number}</td>
                <td>${bus.starting_point}</td>
                <td>${bus.ending_point}</td>
                <td>${bus.seats_left}</td>
                <td>${bus.total_seats}</td>
                <td><button onclick="bookSeat(${bus.bus_id})">Book Seat</button></td>
            `;
            busTable.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
});

// Book a seat
async function bookSeat(busId) {
    const usn = localStorage.getItem('usn'); // Get the logged-in user's USN
    try {
        const response = await fetch('http://127.0.0.1:5000/api/Booking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ usn, bus_id: busId })
        });

        if (response.ok) {
            alert('Seat booked successfully!');
            window.location.reload(); // Refresh the dashboard
        } else {
            const result = await response.json();
            alert('Booking failed: ' + result.message);
        }
    } catch (error) {
        console.error('Error during booking:', error);
    }
}

// Start QR code scanner
function startScanner() {
    if (typeof Html5Qrcode === 'undefined') {
        console.error('Html5Qrcode is not defined. Ensure the library is included.');
        return;
    }
    const html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start(
        { facingMode: "environment" }, // Use the back camera
        {
            fps: 10,
            qrbox: 250
        },
        async (decodedText) => {
            const usn = localStorage.getItem('usn'); // Get the logged-in user's USN
            try {
                const response = await fetch('http://127.0.0.1:5000/api/scan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ usn, location: decodedText })
                });

                if (response.ok) {
                    const result = await response.json();
                    alert(result.message); // Show the fare deduction message
                    window.location.href = 'Transaction.html'; // Redirect to transaction history
                } else {
                    const result = await response.json();
                    alert('QR scan failed: ' + result.message);
                }
            } catch (error) {
                console.error('Error during QR scan:', error);
            }
        },
        (errorMessage) => {
            console.error('QR scan error:', errorMessage);
        }
    );
}

// Load transaction history
document.addEventListener('DOMContentLoaded', async () => {
    const usn = localStorage.getItem('usn'); // Get the logged-in user's USN

    try {
        const response = await fetch(`http://127.0.0.1:5000/api/transactions/${usn}`);
        const transactions = await response.json();
        const transactionTable = document.querySelector('#transactionTableBody');
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(transaction.transaction_date).toLocaleTimeString()}</td>
                <td>${new Date(transaction.transaction_date).toLocaleDateString()}</td>
                <td class="${transaction.amount < 0 ? 'negative' : ''}">₹${transaction.amount}</td>
                <td>${transaction.location}</td>
            `;
            transactionTable.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
});

// Load notifications
document.addEventListener('DOMContentLoaded', async () => {
    const usn = localStorage.getItem('usn'); // Get the logged-in user's USN

    try {
        // Fetch notifications
        const response = await fetch(`http://127.0.0.1:5000/api/notifications/${usn}`);
        const notifications = await response.json();

        if (notifications.length > 0) {
            const notificationDiv = document.createElement('div');
            notificationDiv.innerHTML = `
                <p>Will you board the bus tomorrow?</p>
                <button onclick="respondToNotification('Yes')">Yes</button>
                <button onclick="respondToNotification('No')">No</button>
            `;
            document.body.appendChild(notificationDiv);
        }
    } catch (error) {
        console.error('Error fetching notifications:', error);
    }
});

// Respond to notification
async function respondToNotification(response) {
    const usn = localStorage.getItem('usn'); // Get the logged-in user's USN
    try {
        const res = await fetch('http://127.0.0.1:5000/api/respond', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usn, response })
        });

        if (res.ok) {
            alert('Response recorded!');
            window.location.reload(); // Reload the page
        } else {
            alert('Failed to record response.');
        }
    } catch (error) {
        console.error('Error recording response:', error);
    }
}
