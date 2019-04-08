
for file in $(ls *.js);do
  echo $file
  echo "--------";
  node $file
done
