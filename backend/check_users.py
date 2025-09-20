import sqlite3

conn = sqlite3.connect("clipboard_history.db")
c = conn.cursor()
c.execute("SELECT username FROM users")
users = c.fetchall()
conn.close()
print("Users in DB:", users)