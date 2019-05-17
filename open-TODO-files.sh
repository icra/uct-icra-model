#!/bin/bash

#open all files containing the words "TODO" or "TBD"
vim -o $(grep --exclude 'open-TODO-files.sh' --exclude-dir 'dev-docs' -e "TODO" -e "TBD" . -r| cut -d\: -f1| uniq)
