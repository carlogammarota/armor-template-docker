chmod +x init.sh

./init.sh

# iniciar mongo en docker
/charlyg/mongo (-d para correr en segundo plano)
docker-compose up -d


Detener todos los contenedores en ejecución:

bash

sudo docker stop $(sudo docker ps -a -q)

Eliminar todos los contenedores:

bash

sudo docker rm $(sudo docker ps -a -q)

Eliminar todas las imágenes:

bash

sudo docker rmi $(sudo docker images -q) --force

# NOTAS
los dominios no pueden contener mas de cierta cantidad de letras

# abrir puertos para api´s
sudo ufw allow 1000:2000/tcp





docker system prune -a


docker system prune -a

sudo apt-get autoremove

sudo rm -rf /tmp/*



# crear network para las conexiones locales entre contenedor fron, api
docker network create mynetwork




#esto es indispensable para que los contenedores se vuelvan a correr cuando se reinicia ubuntu. 
Crear un archivo de servicio systemd

    Crear un archivo de servicio systemd:

    Crea un archivo de servicio en /etc/systemd/system/docker-compose-app.service:

    bash

sudo nano /etc/systemd/system/docker-compose-app.service

Agregar el siguiente contenido:

ini

    [Unit]
    Description=Docker Compose Application Service
    After=network.target docker.service
    Requires=docker.service

    [Service]
    Type=oneshot
    RemainAfterExit=yes
    WorkingDirectory=/home/charlyg/Escritorio/armor-template-docker
    ExecStart=/usr/local/bin/docker-compose up -d
    ExecStop=/usr/local/bin/docker-compose down
    TimeoutStartSec=0

    [Install]
    WantedBy=multi-user.target

    Asegúrate de que la ruta WorkingDirectory apunte a la ubicación correcta de tu archivo docker-compose.yml.

Recargar systemd y habilitar el servicio

    Recargar systemd:

    bash

sudo systemctl daemon-reload

Habilitar el servicio para que se ejecute al inicio:

bash

    sudo systemctl enable docker-compose-app.service

Iniciar el servicio manualmente (opcional, solo para probar)

    Iniciar el servicio:

    bash

    sudo systemctl start docker-compose-app.service

Paso 3: Verificar el Estado del Servicio

Para verificar que el servicio se está ejecutando correctamente y que se iniciará al arrancar el sistema, puedes usar los siguientes comandos:

bash

sudo systemctl status docker-compose-app.service

Esto mostrará el estado actual del servicio.
Reiniciar la Computadora

Después de configurar todo, reinicia tu computadora y verifica que los contenedores Docker se hayan iniciado automáticamente.

bash

sudo reboot

Después de reiniciar, puedes verificar que los contenedores están corriendo con:

bash

docker ps

Con estos pasos, tus contenedores Docker se deberían iniciar automáticamente cada vez que reinicies tu computadora.

