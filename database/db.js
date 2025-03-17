const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = process.env.DB_PATH;
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Failed to connect to SQLite database:', err.message);
        return;
    }
    console.log('Connected to SQLite database');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user TEXT NOT NULL,
            orderId TEXT NOT NULL,
            state TEXT NOT NULL,
            createdAt TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Failed to create orders table:', err.message);
        } else {
            console.log('Orders table created or already exists');
        }
    });
});

function addOrder(user, orderId, state) {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO orders (user, orderId, state) VALUES (?, ?, ?)`,
            [user, orderId, state],
            function (err) {
                if (err) reject(err);
                else resolve(this.lastID);
            }
        );
    });
}

function updateOrderState(orderId, state) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE orders SET state = ? WHERE orderId = ?`,
            [state, orderId],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

function getUserOrders(user) {
    return new Promise((resolve, reject) => {
        db.all(
            `SELECT orderId, state FROM orders WHERE user = ? ORDER BY createdAt DESC`,
            [user],
            (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
}

function clearUserOrders(user) {
    return new Promise((resolve, reject) => {
        db.run(
            `DELETE FROM orders WHERE user = ?`,
            [user],
            function (err) {
                if (err) reject(err);
                else resolve(this.changes);
            }
        );
    });
}

module.exports = { addOrder, updateOrderState, getUserOrders, clearUserOrders };