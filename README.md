chmod +x init.sh

./init.sh


Detener todos los contenedores en ejecución:

bash

sudo docker stop $(sudo docker ps -a -q)

Eliminar todos los contenedores:

bash

sudo docker rm $(sudo docker ps -a -q)

Eliminar todas las imágenes:

bash

sudo docker rmi $(sudo docker images -q) --force
