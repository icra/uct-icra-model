#!/bin/bash
#desplegar repositori a servidor via ssh
folder='/var/www/vhosts/icradev.cat/ecoadvisor.icra.cat/uct-icra-model'
ssh root@217.61.208.188 "cd $folder; git pull;"
