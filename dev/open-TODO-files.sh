#!/bin/bash

#open all files containing the word "TODO"

vim -o $(grep --exclude-dir 'dev' -e "TODO" . -r| cut -d\: -f1| uniq)
