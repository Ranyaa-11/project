from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MySQL Database Configuration
db = mysql.connector.connect(
    host="localhost",
    user="root",  
    password="1239",
    database="bus_reservation"  
)

# Route to handle user registration
@app.route('/api/register', methods=['POST'])
def register():
    data = request.json  
    usn = data.get('usn')
    name = data.get('name')
    phone = data.get('phone')
    email = data.get('email')
    password = data.get('password')
    bus_num = data.get('bus_num')
    address = data.get('address')

    # Validate required fields
    if not all([usn, name, phone, email, password, bus_num, address]):
        return jsonify({"message": "All fields are required."}), 400

    try:
        cursor = db.cursor()
        query = """
            INSERT INTO users (usn, name, phone, email, password, bus_num, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        values = (usn, name, phone, email, password, bus_num, address)
        cursor.execute(query, values)
        db.commit()
        return jsonify({"message": "Registration successful!"}), 200
    except mysql.connector.Error as err:
        print("Database error:", err)
        return jsonify({"message": "Database error occurred."}), 500

# Route to handle user login
@app.route('/api/Log', methods=['POST'])
def login():
    data = request.json
    usn = data.get('usn')
    password = data.get('password')

    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE usn = %s AND password = %s", (usn, password))
    user = cursor.fetchone()

    if user:
        return jsonify({"message": "Login successful!", "usn": user['usn']}), 200
    else:
        return jsonify({"message": "Invalid USN or password."}), 401

# Route to fetch user details
@app.route('/api/user/<usn>', methods=['GET'])
def get_user(usn):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE usn = %s", (usn,))
    user = cursor.fetchone()
    if user:
        return jsonify(user), 200
    else:
        return jsonify({"message": "User not found."}), 404



# Route to handle seat booking
@app.route('/api/Booking', methods=['POST'])
def reserve():
    data = request.json
    usn = data.get('usn')
    bus_id = data.get('bus_id')

    cursor = db.cursor()
    cursor.execute("SELECT seats_left FROM buses WHERE bus_id = %s", (bus_id,))
    bus = cursor.fetchone()

    if bus and bus[0] > 0:
        cursor.execute("INSERT INTO b_reservation (usn, bus_id, reservation_date) VALUES (%s, %s, CURDATE())", (usn, bus_id))
        cursor.execute("UPDATE buses SET seats_left = seats_left - 1 WHERE bus_id = %s", (bus_id,))
        db.commit()
        return jsonify({"message": "Seat booked successfully!"}), 200
    else:
        return jsonify({"message": "No seats available."}), 400

# Route to handle QR code scanning
@app.route('/api/QR', methods=['POST'])
def scan():
    data = request.json
    usn = data.get('usn')
    location = data.get('location')

    cursor = db.cursor()
    cursor.execute("UPDATE users SET balance = balance - 30 WHERE usn = %s", (usn,))
    cursor.execute("INSERT INTO b_transaction (usn, amount, location) VALUES (%s, -30, %s)", (usn, location))
    db.commit()
    return jsonify({"message": "Fare deducted successfully!"}), 200

# Route to fetch transaction history
@app.route('/api/Transaction/<usn>', methods=['GET'])
def get_transactions(usn):
    cursor = db.cursor(dictionary=True)
    cursor.execute("SELECT * FROM b_transaction WHERE usn = %s", (usn,))
    transactions = cursor.fetchall()
    return jsonify(transactions), 200

# Route to fetch notifications for a user
@app.route('/api/notifications/<usn>', methods=['GET'])
def get_notifications(usn):
    cursor = db.cursor(dictionary=True)
    cursor.execute("""
        SELECT * FROM b_reservation
        WHERE usn = %s AND reservation_date = CURDATE() AND status = 'No'
    """, (usn,))
    notifications = cursor.fetchall()
    return jsonify(notifications), 200
# Route to handle QR code scanning
@app.route('/api/scan_qr', methods=['POST'])
def scan_qr():
    data = request.json
    usn = data.get('usn')
    qr_code_data = data.get('qr_code_data')  # Assuming the QR code contains some data

    # Validate the input
    if not usn or not qr_code_data:
        return jsonify({"message": "USN and QR code data are required."}), 400

    try:
        cursor = db.cursor(dictionary=True)
        # Example: Validate the QR code data (you can customize this logic)
        cursor.execute("SELECT * FROM b_reservation WHERE usn = %s AND qr_code = %s", (usn, qr_code_data))
        reservation = cursor.fetchone()

        if reservation:
            # Mark the reservation as completed or scanned
            cursor.execute("UPDATE b_reservation SET status = 'Scanned' WHERE usn = %s AND qr_code = %s", (usn, qr_code_data))
            db.commit()
            return jsonify({"message": "QR code scanned successfully!"}), 200
        else:
            return jsonify({"message": "Invalid QR code or reservation not found."}), 404
    except mysql.connector.Error as err:
        print("Database error:", err)
        return jsonify({"message": "Database error occurred."}), 500