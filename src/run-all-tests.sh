#!/bin/bash

#execute all js files
for file in $(ls *.js);do
  echo -n "$file | "
  node $file
  s=$? #exit status of last command
  if [[ $s == 0 ]];then
    echo "ok"
  else
    echo "there is a problem in $file"
  fi
done | column -t
