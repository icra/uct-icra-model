#!/bin/bash

#execute all js files
for file in $(ls *.js);do
  echo -n "$file | "
  node $file

  #check exit status of last command
  if [[ $? == 0 ]];then
    echo "ok"
  else
    echo "there is a problem in $file"
  fi

done | column -t