#!/bin/bash

# Función para clonar o realizar pull dependiendo de la existencia del directorio
clone_or_pull() {
    if [ -d "$2" ]; then
        echo "Realizando git pull en $2..."
        cd "$2" || exit
        git pull
        cd ..
    else
        echo "Clonando $1 en $2..."
        git clone "$1" "$2"
    fi
}

# Clonar o hacer pull en el repositorio template-themefores y cambiarle el nombre a frontend
clone_or_pull https://github.com/carlogammarota/template-themefores frontend

# Clonar o hacer pull en el repositorio template-themeforest-api y cambiarle el nombre a api
clone_or_pull https://github.com/carlogammarota/template-themeforest-api api
