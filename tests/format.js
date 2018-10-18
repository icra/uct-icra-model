/*convert a number to a string: i.e. 3999.4 turns into "3,999.4"*/
function format(number,digits){
  digits=digits||0;
  if(number< 100   )digits=2;
  if(number<  10   )digits=3;
  if(number<   1   )digits=4;
  if(number<   0.1 )digits=5;
  if(number<   0.01)digits=6;
  let str=new Intl.NumberFormat('en-EN',{maximumFractionDigits:digits}).format(number);
  return str;
}

String.prototype.prettifyUnit=function(){
  return this
    .replace('m3','m<sup>3</sup>')
    .replace(/_/g,' ')
}
