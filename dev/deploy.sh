#!/bin/bash

#desplegar model a strato server
folder="/var/www/vhosts/h2793818.stratoserver.net/ecoadvisor.icra.cat/uct-icra-model"
ssh root@85.214.122.54 "cd $folder; git pull; git status"
