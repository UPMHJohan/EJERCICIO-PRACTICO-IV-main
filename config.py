import pymysql
from pymysql.cursors import DictCursor

# Ajusta estos datos según tu instalación de MySQL
DB_CONFIG = {
    "host": "mysql.railway.internal",
    "user": "root",
    "password": "lAaXBbnyvHpymCKwhPSEysGjNNdfrCUL",
    "database": "mecanografia_db",  # <-- Cambiado a tu base de datos
    "port": 3306,
    "cursorclass": DictCursor,
}


def get_connection():
    return pymysql.connect(**DB_CONFIG)