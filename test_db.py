from config import get_connection

def probar_conexion():
    try:
        connection = get_connection()
        print("¡Conexión exitosa a MySQL en Railway!")
        
        with connection.cursor() as cursor:
            # Consultamos los usuarios de la tabla que creaste
            cursor.execute("SELECT * FROM Usuario;")
            usuarios = cursor.fetchall()
            print("\nUsuarios encontrados en la BD:")
            for usuario in usuarios:
                print(usuario)
                
        connection.close()
    except Exception as e:
        print(f"Error al conectar con la base de datos: {e}")

if __name__ == "__main__":
    probar_conexion()