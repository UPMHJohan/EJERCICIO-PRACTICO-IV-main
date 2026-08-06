import pymysql
from pymysql.cursors import DictCursor

DB_CONFIG = {
    "host": "altaria.proxy.rlwy.net",
    "user": "root",
    "password": "lAaXBbnyvHpymCKwhPSEysGjNNdfrCUL",
    "database": "mecanografia_db",  # Mantenemos la base de datos que creaste
    "port": 27453,
    "cursorclass": DictCursor,
}


def get_connection():
    return pymysql.connect(**DB_CONFIG)