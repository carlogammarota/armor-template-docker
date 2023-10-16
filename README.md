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
